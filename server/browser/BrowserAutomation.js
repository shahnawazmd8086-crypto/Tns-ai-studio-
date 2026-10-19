'use strict';

const net = require('node:net');

function classifySubmissionResult(input = {}) {
  const text = String(input.text || '').slice(0, 10000);
  const status = Number(input.status);
  if (Number.isFinite(status) && status >= 400) return { verification: 'rejection_detected', accepted: false, reason: `The resulting page returned HTTP ${status}; the website may have rejected the submission.` };
  if (/\bthank you\b|\bsubmission (?:was )?successful\b|\bsuccessfully submitted\b|\bmessage (?:was )?sent\b|\bwe have received your (?:message|submission|application)\b|\bform submitted\b/i.test(text)) return { verification: 'confirmation_detected', accepted: true, reason: 'The resulting page contains text commonly used as a submission confirmation. This is evidence, not a guarantee of backend acceptance.' };
  if (/\bsubmission failed\b|\bcould not submit\b|\bplease try again\b|\bsomething went wrong\b|\binvalid form\b|\berror submitting\b/i.test(text)) return { verification: 'rejection_detected', accepted: false, reason: 'The resulting page contains text indicating the submission may have failed.' };
  return { verification: 'inconclusive', accepted: null, reason: 'The page did not provide a clear success or failure signal. Check the website directly; TNS cannot confirm acceptance.' };
}

function validatePublicHttpUrl(value) {
  let url;
  try { url = new URL(String(value || '')); } catch { throw new Error('Enter a valid website URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS website URLs are supported.');
  if (url.username || url.password) throw new Error('Website URLs must not contain embedded usernames or passwords.');
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('For safety, TNS can inspect public websites only.');
  }
  if (net.isIP(host)) {
    const blocked = host === '::1' || host === '::' || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^0\./.test(host);
    if (blocked) throw new Error('For safety, TNS cannot inspect private or local network addresses.');
  }
  url.hash = '';
  return url.toString();
}

async function inspectPublicWebsite(rawUrl) {
  const targetUrl = validatePublicHttpUrl(rawUrl);
  const token = String(process.env.BROWSERLESS_TOKEN || '').trim();
  const endpoint = String(process.env.BROWSERLESS_FUNCTION_URL || 'https://production-sfo.browserless.io/function').trim();
  if (!token) {
    const error = new Error('Browser automation is not configured. Set BROWSERLESS_TOKEN on the server to enable public website inspection.');
    error.statusCode = 503;
    throw error;
  }
  let endpointUrl;
  try { endpointUrl = new URL(endpoint); } catch {
    const error = new Error('BROWSERLESS_FUNCTION_URL is invalid.'); error.statusCode = 500; throw error;
  }
  if (endpointUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    const error = new Error('Browser automation endpoint must use HTTPS in production.'); error.statusCode = 500; throw error;
  }
  endpointUrl.searchParams.set('token', token);
  const code = `module.exports = async ({ page }) => {\n  const targetUrl = ${JSON.stringify(targetUrl)};\n  const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });\n  await page.waitForTimeout(700);\n  const result = await page.evaluate(() => ({ title: document.title || '', url: location.href, text: (document.body?.innerText || '').slice(0, 12000), links: Array.from(document.querySelectorAll('a[href]')).slice(0, 40).map(a => ({ text: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 180), url: a.href })).filter(a => /^https?:/.test(a.url)) }));\n  return { status: response ? response.status() : null, ...result };\n};`;
  let response;
  try {
    response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' },
      body: code,
      signal: AbortSignal.timeout(30000)
    });
  } catch {
    const error = new Error('The remote browser could not be reached. Check the browser service configuration and try again.'); error.statusCode = 502; throw error;
  }
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(response.status === 401 || response.status === 403 ? 'Browser service rejected its token. Check BROWSERLESS_TOKEN.' : `Browser service returned HTTP ${response.status}.`);
    error.statusCode = response.status === 429 ? 429 : 502;
    throw error;
  }
  let data;
  try { data = JSON.parse(text); } catch { const error = new Error('Browser service returned an unreadable result.'); error.statusCode = 502; throw error; }
  return {
    success: true,
    mode: 'public_read_only_inspection',
    note: 'TNS inspected public page content only. No login, form submission, upload, purchase, or other website change was performed.',
    page: {
      status: Number.isFinite(Number(data.status)) ? Number(data.status) : null,
      title: String(data.title || '').slice(0, 500),
      url: String(data.url || targetUrl).slice(0, 2000),
      text: String(data.text || '').slice(0, 12000),
      links: Array.isArray(data.links) ? data.links.slice(0, 40).map(link => ({ text: String(link.text || '').slice(0, 180), url: String(link.url || '').slice(0, 2000) })).filter(link => /^https?:\/\//i.test(link.url)) : []
    }
  };
}


// Read-only preparation pass: maps visible form controls and actions so TNS can
// prepare a user-reviewable plan without entering data or changing the website.
async function inspectInteractiveWebsite(rawUrl) {
  const targetUrl = validatePublicHttpUrl(rawUrl);
  const token = String(process.env.BROWSERLESS_TOKEN || '').trim();
  const endpoint = String(process.env.BROWSERLESS_FUNCTION_URL || 'https://production-sfo.browserless.io/function').trim();
  if (!token) {
    const error = new Error('Browser automation is not configured. Set BROWSERLESS_TOKEN on the server to enable website preparation.');
    error.statusCode = 503;
    throw error;
  }
  let endpointUrl;
  try { endpointUrl = new URL(endpoint); } catch {
    const error = new Error('BROWSERLESS_FUNCTION_URL is invalid.'); error.statusCode = 500; throw error;
  }
  if (endpointUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    const error = new Error('Browser automation endpoint must use HTTPS in production.'); error.statusCode = 500; throw error;
  }
  endpointUrl.searchParams.set('token', token);
  const code = `module.exports = async ({ page }) => {\n  const targetUrl = ${JSON.stringify(targetUrl)};\n  const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });\n  await page.waitForTimeout(500);\n  const result = await page.evaluate(() => {\n    const labelFor = (el) => { const id = el.id; const label = id ? document.querySelector('label[for="' + CSS.escape(id) + '"]') : null; return ((label?.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || el.id || '').trim()).slice(0,160); };\n    const forms = Array.from(document.querySelectorAll('form')).slice(0,15).map((form, index) => ({ index, action: form.action || location.href, method: (form.method || 'get').toLowerCase(), fields: Array.from(form.querySelectorAll('input,textarea,select')).slice(0,40).map(el => ({ label: labelFor(el), name: String(el.name || '').slice(0,120), type: String(el.type || el.tagName.toLowerCase()).slice(0,40), required: Boolean(el.required), disabled: Boolean(el.disabled), options: el.tagName === 'SELECT' ? Array.from(el.options).slice(0,30).map(o => ({ label: (o.label || o.textContent || '').trim().slice(0,100), value: String(o.value || '').slice(0,100) })) : undefined })).filter(f => f.type !== 'hidden' && f.type !== 'password' && f.type !== 'file') }));\n    const buttons = Array.from(document.querySelectorAll('button,input[type=submit],input[type=button],[role=button]')).slice(0,40).map(el => ({ label: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0,160), type: el.type || el.getAttribute('role') || 'button', disabled: Boolean(el.disabled) })).filter(b => b.label);\n    return { title: document.title || '', url: location.href, text: (document.body?.innerText || '').slice(0,8000), forms, buttons };\n  });\n  return { status: response ? response.status() : null, ...result };\n};`;
  let response;
  try {
    response = await fetch(endpointUrl, { method: 'POST', headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' }, body: code, signal: AbortSignal.timeout(30000) });
  } catch {
    const error = new Error('The remote browser could not be reached. Check the browser service configuration and try again.'); error.statusCode = 502; throw error;
  }
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(response.status === 401 || response.status === 403 ? 'Browser service rejected its token. Check BROWSERLESS_TOKEN.' : `Browser service returned HTTP ${response.status}.`);
    error.statusCode = response.status === 429 ? 429 : 502; throw error;
  }
  let data;
  try { data = JSON.parse(text); } catch { const error = new Error('Browser service returned an unreadable result.'); error.statusCode = 502; throw error; }
  const forms = Array.isArray(data.forms) ? data.forms.slice(0, 15).map((form, index) => ({
    index,
    action: String(form.action || targetUrl).slice(0, 2000),
    method: String(form.method || 'get').toLowerCase().slice(0, 10),
    fields: Array.isArray(form.fields) ? form.fields.slice(0, 40).map((field) => ({
      label: String(field.label || '').slice(0, 160),
      name: String(field.name || '').slice(0, 120),
      type: String(field.type || '').slice(0, 40),
      required: Boolean(field.required),
      disabled: Boolean(field.disabled),
      ...(Array.isArray(field.options) ? { options: field.options.slice(0, 30).map((option) => ({ label: String(option.label || '').slice(0, 100), value: String(option.value || '').slice(0, 100) })) } : {})
    })) : []
  })) : [];
  const buttons = Array.isArray(data.buttons) ? data.buttons.slice(0,40).map(b => ({ label: String(b.label || '').slice(0,160), type: String(b.type || 'button').slice(0,40), disabled: Boolean(b.disabled) })) : [];
  return { success: true, mode: 'read_only_form_preparation', note: 'This is a read-only map for planning. TNS did not fill fields, upload files, click action buttons, sign in, accept terms, submit, send, book, or pay. User review and explicit approval are required before any consequential action; this endpoint itself cannot perform those actions.', page: { status: Number.isFinite(Number(data.status)) ? Number(data.status) : null, title: String(data.title || '').slice(0,500), url: String(data.url || targetUrl).slice(0,2000), text: String(data.text || '').slice(0,8000), forms, buttons } };
}


// Draft-only form fill: accepts user-supplied values for ordinary visible fields,
// returns a review preview, and never clicks or submits any form.
async function draftFormFill(rawUrl, rawValues, rawFormIndex = 0) {
  const targetUrl = validatePublicHttpUrl(rawUrl);
  if (!rawValues || typeof rawValues !== 'object' || Array.isArray(rawValues)) throw new Error('Provide field values as an object keyed by the exact field name or id.');
  const entries = Object.entries(rawValues);
  if (!entries.length || entries.length > 30) throw new Error('Provide between 1 and 30 form fields.');
  const values = {};
  const sensitiveName = /(pass(word)?|otp|one.?time|secret|token|auth|card|cvv|cvc|security.?code|bank|routing|ssn|social.?security|file|upload|agree|consent|accept|terms|signature)/i;
  for (const [key, value] of entries) {
    if (!key || key.length > 120 || !['string', 'number', 'boolean'].includes(typeof value)) throw new Error('Each field key must be a short name/id and each value must be text, a number, or a boolean.');
    if (sensitiveName.test(key)) throw new Error(`For safety, TNS will not draft-fill sensitive or consent-related field "${key}".`);
    const text = String(value);
    if (text.length > 2000) throw new Error(`The value for "${key}" is too long (maximum 2000 characters).`);
    values[key] = text;
  }
  const formIndex = Number(rawFormIndex);
  if (!Number.isInteger(formIndex) || formIndex < 0 || formIndex > 14) throw new Error('formIndex must be an integer from 0 to 14.');
  const token = String(process.env.BROWSERLESS_TOKEN || '').trim();
  const endpoint = String(process.env.BROWSERLESS_FUNCTION_URL || 'https://production-sfo.browserless.io/function').trim();
  if (!token) { const error = new Error('Browser automation is not configured. Set BROWSERLESS_TOKEN on the server to enable form draft preview.'); error.statusCode = 503; throw error; }
  let endpointUrl;
  try { endpointUrl = new URL(endpoint); } catch { const error = new Error('BROWSERLESS_FUNCTION_URL is invalid.'); error.statusCode = 500; throw error; }
  if (endpointUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') { const error = new Error('Browser automation endpoint must use HTTPS in production.'); error.statusCode = 500; throw error; }
  endpointUrl.searchParams.set('token', token);
  const code = `module.exports = async ({ page }) => {
    const targetUrl = ${JSON.stringify(targetUrl)};
    const values = ${JSON.stringify(values)};
    const formIndex = ${formIndex};
    await page.setRequestInterception(true);
    page.on('request', request => {
      let allow = false;
      try {
        const u = new URL(request.url());
        const h = u.hostname.toLowerCase().replace(/^\\[|\\]$/g, '');
        const privateIp = h === '::1' || h === '::' || /^127\\./.test(h) || /^10\\./.test(h) || /^192\\.168\\./.test(h) || /^169\\.254\\./.test(h) || /^172\\.(1[6-9]|2\\d|3[01])\\./.test(h) || /^0\\./.test(h);
        allow = ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password && h !== 'localhost' && !h.endsWith('.localhost') && !h.endsWith('.local') && !h.endsWith('.internal') && !privateIp;
      } catch {}
      if (allow) request.continue().catch(() => {}); else request.abort().catch(() => {});
    });
    const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(500);
    const result = await page.evaluate(({ values, formIndex }) => {
      const forms = Array.from(document.querySelectorAll('form')).slice(0, 15);
      const form = forms[formIndex];
      if (!form) return { error: 'Requested form was not found on this page.', title: document.title || '', url: location.href, fields: [] };
      const controls = Array.from(form.querySelectorAll('input,textarea,select'));
      const safeTypes = ['text','email','tel','url','search','number','date','month','week','time','datetime-local'];
      const fields = [];
      for (const [key, value] of Object.entries(values)) {
        const el = controls.find(candidate => (candidate.name && candidate.name === key) || (candidate.id && candidate.id === key));
        if (!el) { fields.push({ key, status: 'not_found' }); continue; }
        const type = String(el.type || el.tagName.toLowerCase()).toLowerCase();
        const name = String(el.name || el.id || '');
        if (el.disabled || el.readOnly || type === 'hidden' || type === 'password' || type === 'file' || type === 'checkbox' || type === 'radio' || !(['select','textarea'].includes(el.tagName.toLowerCase()) || safeTypes.includes(type)) || /(pass(word)?|otp|one.?time|secret|token|auth|card|cvv|cvc|security.?code|bank|routing|ssn|social.?security|file|upload|agree|consent|accept|terms|signature)/i.test(name)) {
          fields.push({ key, status: 'blocked_unsafe_or_unsupported' }); continue;
        }
        if (el.tagName.toLowerCase() === 'select') {
          const option = Array.from(el.options).find(o => o.value === value || (o.label || o.textContent || '').trim() === value);
          if (!option) { fields.push({ key, status: 'option_not_found' }); continue; }
          el.value = option.value;
        } else {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const label = el.id ? document.querySelector('label[for="' + CSS.escape(el.id) + '"]') : null;
        fields.push({ key, label: String(label?.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || name).trim().slice(0,160), status: 'draft_filled', value: String(el.value || '').slice(0,2000), required: Boolean(el.required), type });
      }
      return { title: document.title || '', url: location.href, formAction: form.action || location.href, formMethod: (form.method || 'get').toLowerCase(), fields, screenshot: null };
    }, { values, formIndex });
    if (!result.error) { try { result.screenshot = (await page.screenshot({ type: 'jpeg', quality: 55, fullPage: false })).toString('base64'); } catch {} }
    return { status: response ? response.status() : null, ...result };
  };`;
  let response;
  try { response = await fetch(endpointUrl, { method: 'POST', headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' }, body: code, signal: AbortSignal.timeout(35000) }); }
  catch { const error = new Error('The remote browser could not be reached. Check the browser service configuration and try again.'); error.statusCode = 502; throw error; }
  const text = await response.text();
  if (!response.ok) { const error = new Error(response.status === 401 || response.status === 403 ? 'Browser service rejected its token. Check BROWSERLESS_TOKEN.' : `Browser service returned HTTP ${response.status}.`); error.statusCode = response.status === 429 ? 429 : 502; throw error; }
  let data;
  try { data = JSON.parse(text); } catch { const error = new Error('Browser service returned an unreadable result.'); error.statusCode = 502; throw error; }
  let finalUrl = targetUrl;
  try { finalUrl = validatePublicHttpUrl(data.url || targetUrl); } catch { const error = new Error('The website redirected to a non-public or unsafe address; TNS stopped the draft operation.'); error.statusCode = 400; throw error; }
  return {
    success: true,
    mode: 'draft_fill_preview_only',
    note: 'TNS filled only supported ordinary visible fields in a temporary page and prepared this preview. Nothing was submitted, sent, published, uploaded, booked, or paid for. This preview is not saved as a persistent browser session. Review the values before deciding what to do next.',
    page: {
      status: Number.isFinite(Number(data.status)) ? Number(data.status) : null,
      title: String(data.title || '').slice(0, 500),
      url: finalUrl.slice(0, 2000),
      formAction: String(data.formAction || '').slice(0, 2000),
      formMethod: String(data.formMethod || 'get').slice(0, 10),
      fields: Array.isArray(data.fields) ? data.fields.slice(0, 30).map(f => ({ key: String(f.key || '').slice(0,120), label: String(f.label || '').slice(0,160), status: String(f.status || 'unknown').slice(0,50), ...(f.value !== undefined ? { value: String(f.value).slice(0,2000) } : {}), ...(f.required !== undefined ? { required: Boolean(f.required) } : {}), ...(f.type ? { type: String(f.type).slice(0,40) } : {}) })) : [],
      screenshot: typeof data.screenshot === 'string' && data.screenshot.length <= 2_000_000 ? data.screenshot : null
    }
  };
}


// Execute one already-approved anonymous public form submission. The approval
// ticket is consumed by the authenticated API before this function is called.
async function executeApprovedFormAction(rawUrl, rawValues, rawFormIndex = 0) {
  const targetUrl = validatePublicHttpUrl(rawUrl);
  if (!rawValues || typeof rawValues !== 'object' || Array.isArray(rawValues)) throw new Error('Approved form values are invalid.');
  const entries = Object.entries(rawValues);
  if (!entries.length || entries.length > 30) throw new Error('Approved form must contain between 1 and 30 fields.');
  const values = {};
  const unsafe = /(pass(word)?|otp|one.?time|secret|token|auth|card|cvv|cvc|security.?code|bank|routing|ssn|social.?security|file|upload|agree|consent|accept|terms|signature|payment|checkout)/i;
  for (const [key, value] of entries) {
    if (!key || key.length > 120 || unsafe.test(key) || !['string','number','boolean'].includes(typeof value)) throw new Error('Only ordinary non-sensitive public form fields can be submitted by this executor.');
    values[key] = String(value);
    if (values[key].length > 2000) throw new Error('A reviewed field value is too long.');
  }
  const formIndex = Number(rawFormIndex);
  if (!Number.isInteger(formIndex) || formIndex < 0 || formIndex > 14) throw new Error('formIndex must be an integer from 0 to 14.');
  const token = String(process.env.BROWSERLESS_TOKEN || '').trim();
  if (!token) { const error = new Error('Browser automation is not configured. Set BROWSERLESS_TOKEN to enable approved public form actions.'); error.statusCode = 503; throw error; }
  const endpoint = String(process.env.BROWSERLESS_FUNCTION_URL || 'https://production-sfo.browserless.io/function').trim();
  let endpointUrl;
  try { endpointUrl = new URL(endpoint); } catch { const error = new Error('BROWSERLESS_FUNCTION_URL is invalid.'); error.statusCode = 500; throw error; }
  if (endpointUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') { const error = new Error('Browser automation endpoint must use HTTPS in production.'); error.statusCode = 500; throw error; }
  endpointUrl.searchParams.set('token', token);
  const code = `module.exports = async ({ page }) => {
    const targetUrl = ${JSON.stringify(targetUrl)};
    const values = ${JSON.stringify(values)};
    const formIndex = ${formIndex};
    await page.setRequestInterception(true);
    page.on('request', request => {
      let allow = false;
      try {
        const u = new URL(request.url()); const h = u.hostname.toLowerCase().replace(/^\\[|\\]$/g, '');
        const ip = require('node:net').isIP(h);
        const privateIp = h === '::1' || h === '::' || /^127\\./.test(h) || /^10\\./.test(h) || /^192\\.168\\./.test(h) || /^169\\.254\\./.test(h) || /^172\\.(1[6-9]|2\\d|3[01])\\./.test(h) || /^0\\./.test(h) || (ip === 6 && (/^(fc|fd|fe80):/i.test(h)));
        allow = ['http:','https:'].includes(u.protocol) && !u.username && !u.password && h !== 'localhost' && !h.endsWith('.localhost') && !h.endsWith('.local') && !h.endsWith('.internal') && !privateIp;
      } catch {}
      if (allow) request.continue().catch(() => {}); else request.abort().catch(() => {});
    });
    const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(500);
    const initial = await page.evaluate(({ values, formIndex, targetUrl }) => {
      if (location.origin !== new URL(targetUrl).origin) return { error: 'Page redirected to a different origin; submission stopped.' };
      const forms = Array.from(document.querySelectorAll('form')).slice(0,15); const form = forms[formIndex];
      if (!form) return { error: 'Reviewed form was not found.' };
      const action = new URL(form.action || location.href, location.href);
      if (action.origin !== location.origin) return { error: 'Cross-origin form submission is blocked.' };
      if ((form.method || 'get').toLowerCase() !== 'post') return { error: 'Only POST forms can be submitted by this executor.' };
      if (/(login|sign.?in|register|signup|checkout|payment|donat|delete|remove|purchase|order|booking|reservation|terms|consent|password|otp)/i.test(location.pathname + ' ' + document.title + ' ' + form.innerText)) return { error: 'This page appears to involve login, payment, consent, or another restricted action.' };
      const controls = Array.from(form.querySelectorAll('input,textarea,select'));
      const safeTypes = ['text','email','tel','url','search','number','date','month','week','time','datetime-local'];
      const filled = [];
      for (const [key,value] of Object.entries(values)) {
        const el = controls.find(c => (c.name && c.name === key) || (c.id && c.id === key));
        if (!el) return { error: 'Reviewed field no longer exists: ' + key };
        const type = String(el.type || el.tagName.toLowerCase()).toLowerCase();
        if (el.disabled || el.readOnly || type === 'hidden' || type === 'password' || type === 'file' || type === 'checkbox' || type === 'radio' || !(['select','textarea'].includes(el.tagName.toLowerCase()) || safeTypes.includes(type)) || /(pass(word)?|otp|token|auth|card|cvv|bank|ssn|upload|agree|consent|accept|terms|signature|payment)/i.test(String(el.name || el.id))) return { error: 'A reviewed field is no longer safe to fill: ' + key };
        if (el.tagName.toLowerCase() === 'select') { const opt = Array.from(el.options).find(o => o.value === value || (o.label || o.textContent || '').trim() === value); if (!opt) return { error: 'A reviewed select option no longer exists: ' + key }; el.value = opt.value; }
        else { el.value = value; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
        filled.push({key, value:String(el.value || '').slice(0,2000), required:Boolean(el.required)});
      }
      for (const el of controls) if (el.required && !el.disabled && !String(el.value || '').trim()) return { error: 'A required field is empty; submission stopped.' };
      const submit = Array.from(form.querySelectorAll('button[type=submit],input[type=submit]')).find(b => !b.disabled && !/(pay|purchase|order|delete|remove|accept|agree|consent|book|reserve|checkout)/i.test(String(b.innerText || b.value || b.getAttribute('aria-label') || '')));
      if (!submit) return { error: 'No safe, enabled submit button was found.' };
      submit.setAttribute('data-tns-approved-submit','1');
      return { ready:true, title:document.title || '', url:location.href, formAction:action.href, fields:filled, buttonLabel:String(submit.innerText || submit.value || submit.getAttribute('aria-label') || 'Submit').trim().slice(0,120) };
    }, { values, formIndex, targetUrl });
    if (initial.error) return { executed:false, status:response ? response.status() : null, ...initial };
    let finalResponse = null;
    try { const result = await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded', timeout:8000 }).catch(() => null), page.click('[data-tns-approved-submit="1"]')]); finalResponse = result[0]; } catch {}
    const final = await page.evaluate(() => ({ title:document.title || '', url:location.href, text:(document.body?.innerText || '').slice(0,3000) }));
    final.status = finalResponse ? finalResponse.status() : null;
    return { executed:true, status:response ? response.status() : null, ...initial, final };
  };`;
  let response;
  try { response = await fetch(endpointUrl, { method:'POST', headers:{'Content-Type':'application/javascript','Cache-Control':'no-cache'}, body:code, signal:AbortSignal.timeout(35000) }); }
  catch { const error = new Error('The remote browser could not be reached. The one-time approval ticket was consumed; review and approve a fresh attempt if needed.'); error.statusCode = 502; throw error; }
  const text = await response.text();
  if (!response.ok) { const error = new Error(response.status === 401 || response.status === 403 ? 'Browser service rejected its token. Check BROWSERLESS_TOKEN.' : `Browser service returned HTTP ${response.status}.`); error.statusCode = response.status === 429 ? 429 : 502; throw error; }
  let data; try { data = JSON.parse(text); } catch { const error = new Error('Browser service returned an unreadable result.'); error.statusCode = 502; throw error; }
  let finalUrl = targetUrl;
  try { finalUrl = validatePublicHttpUrl(data.final?.url || data.url || targetUrl); } catch { const error = new Error('The website navigated to a non-public or unsafe address; result details were withheld.'); error.statusCode = 400; throw error; }
  const pageStatus = Number.isFinite(Number(data.final?.status)) ? Number(data.final.status) : (Number.isFinite(Number(data.status)) ? Number(data.status) : null);
  const pageText = String(data.final?.text || data.error || '').slice(0,3000);
  const verification = data.executed ? classifySubmissionResult({ status: pageStatus, text: pageText }) : { verification: 'not_executed', accepted: false, reason: 'The action was stopped before submission.' };
  return { success:true, mode:data.executed ? 'approved_public_form_action_executed' : 'approved_action_stopped_by_safety_check', executed:Boolean(data.executed), verification, note:data.executed ? 'The approved form submit was attempted. Verification is heuristic; a detected confirmation is not a guarantee of backend acceptance.' : 'The action was not executed because a safety check stopped it.', page:{ status:pageStatus, title:String(data.final?.title || data.title || '').slice(0,500), url:finalUrl.slice(0,2000), text:pageText, formAction:String(data.formAction || '').slice(0,2000), fields:Array.isArray(data.fields) ? data.fields.slice(0,30) : [], buttonLabel:String(data.buttonLabel || '').slice(0,120) } };
}

module.exports = { validatePublicHttpUrl, classifySubmissionResult, inspectPublicWebsite, inspectInteractiveWebsite, draftFormFill, executeApprovedFormAction };
