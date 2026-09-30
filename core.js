/* ===== النواة: الاتصال، الدخول، التنقل، الأدوات المشتركة، نظرة عامة ===== */
const SUPABASE_URL = 'https://cxtmvsoxgfsormhcklfx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dG12c294Z2Zzb3JtaGNrbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNzI4MjQsImV4cCI6MjEwNTg0ODgyNH0.9zsPxYkMvHuRoe1R-XW8xOEUsE3IvoPP_r-iYXU_5s8';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GR = ['أولى إعدادي', 'ثانية إعدادي', 'ثالثة إعدادي', 'أولى ثانوي', 'ثانية ثانوي', 'ثالثة ثانوي'];
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fdt = d => d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fdd = d => d ? new Date(d).toLocaleDateString('ar-EG', { dateStyle: 'medium' }) : '—';
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const fullName = p => p ? [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ') : '—';
const bdg = (t, c) => '<span class="bdg ' + (c || '') + '">' + esc(t) + '</span>';
const VIEWS = {}, ACT = {}, TITLES = { overview: 'نظرة عامة', courses: 'الكورسات والمحتوى', students: 'الطلاب', devices: 'الأجهزة وتسجيل الدخول', codes: 'الاشتراكات والأكواد', exams: 'الامتحانات والأسئلة', results: 'النتائج والتصحيح', reports: 'التقارير', announcements: 'الإعلانات', admins: 'المشرفون' };
let ME = {};

/* ---------- أدوات الواجهة ---------- */
function toast(m, bad) { const e = document.createElement('div'); e.className = 'toast' + (bad ? ' bad' : ''); e.textContent = m; $('#toasts').appendChild(e); setTimeout(() => e.remove(), 3400); }
const fld = (l, n, v = '', t = 'text', x = '') => '<label class="f"><span>' + l + '</span><input name="' + n + '" type="' + t + '" value="' + esc(v) + '" ' + x + '></label>';
const area = (l, n, v = '', x = '') => '<label class="f"><span>' + l + '</span><textarea name="' + n + '" ' + x + '>' + esc(v) + '</textarea></label>';
const chk = (l, n, v) => '<label class="f ck"><input type="checkbox" name="' + n + '"' + (v ? ' checked' : '') + '><span>' + l + '</span></label>';
const sel = (l, n, opts, v = '', x = '') => '<label class="f"><span>' + l + '</span><select name="' + n + '" ' + x + '>' + opts.map(o => { const a = Array.isArray(o) ? o : [o, o]; return '<option value="' + esc(a[0]) + '"' + (String(a[0]) === String(v) ? ' selected' : '') + '>' + esc(a[1]) + '</option>'; }).join('') + '</select></label>';
const tbl = (heads, rows, empty) => rows.length ? '<div class="tw"><table><thead><tr>' + heads.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '<div class="empty">' + (empty || 'لا توجد بيانات') + '</div>';
const btn = (act, id, label, cls) => '<button class="btn sm ' + (cls || '') + '" data-act="' + act + '" data-id="' + esc(id == null ? '' : id) + '">' + label + '</button>';
const gOpts = all => (all ? '<option value="">كل الصفوف</option>' : '') + GR.map(g => '<option value="' + g + '">' + g + '</option>').join('');

function closeModal() { $('#modal').innerHTML = ''; }
/* modal(عنوان، محتوى، دالة الحفظ أو null، {wide, init, save}) */
function modal(title, body, onSubmit, o = {}) {
    $('#modal').innerHTML = '<div class="ov"><div class="mb' + (o.wide ? ' wide' : '') + '"><div class="mh"><h3>' + title + '</h3><button class="x" type="button" data-close>✕</button></div>'
        + '<form id="mf" autocomplete="off">' + body + (onSubmit ? '<div class="acts"><button class="btn main" id="mfs">' + (o.save || 'حفظ') + '</button><button class="btn ghost" type="button" data-close>إلغاء</button></div>' : '') + '</form></div></div>';
    const f = $('#mf');
    if (o.init) o.init(f);
    f.addEventListener('submit', async e => {
        e.preventDefault(); if (!onSubmit) return;
        const b = $('#mfs'); b.disabled = true;
        const v = {}; Array.from(f.elements).forEach(el => { if (!el.name) return; v[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
        try { await onSubmit(v, f); } catch (err) { console.error(err); toast(errMsg(err), true); b.disabled = false; }
    });
}
const errMsg = e => { const m = (e && e.message) || String(e); return m.includes('forbidden') ? 'غير مسموح' : m.includes('user_not_found') ? 'لا يوجد حساب بهذا البريد. لازم يسجّل في المنصة الأول' : m.includes('duplicate') ? 'القيمة موجودة بالفعل' : 'حدث خطأ: ' + m; };
document.addEventListener('click', e => {
    if (e.target.closest('[data-close]') || (e.target.classList && e.target.classList.contains('ov') && e.target === e.target.closest('.ov'))) { closeModal(); return; }
    const b = e.target.closest('[data-act]');
    if (b && ACT[b.dataset.act]) ACT[b.dataset.act](b.dataset.id, b);
});

function csv(name, rows) {
    const t = rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv;charset=utf-8' })); a.download = name + '.csv'; a.click();
}
async function all(make) { let out = [], from = 0; for (;;) { const { data, error } = await make().range(from, from + 999); if (error) throw error; out = out.concat(data); if (data.length < 1000) break; from += 1000; } return out; }
async function upload(bucket, file, folder) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, ''), path = folder + '/' + crypto.randomUUID() + '.' + ext;
    const { error } = await db.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw error; return path;
}
const pubUrl = (bucket, path) => db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
const count = async (t, f) => { let q = db.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); const { count: c } = await q; return c || 0; };

/* ---------- الدخول ---------- */
function showLogin(msg) {
    $('#app').hidden = true; $('#login').hidden = false;
    const e = $('#lerr'); e.style.display = msg ? 'block' : 'none'; e.textContent = msg || '';
}
async function enter(session) {
    const { data: ok } = await db.rpc('is_admin');
    if (ok !== true) { await db.auth.signOut({ scope: 'local' }); showLogin('هذا الحساب غير مصرّح له بالدخول للوحة التحكم.'); return; }
    const { data: own } = await db.rpc('is_owner');
    ME = { id: session.user.id, email: session.user.email, owner: own === true };
    $('#login').hidden = true; $('#app').hidden = false;
    $('#meMail').textContent = ME.email; $('#navAdmins').style.display = ME.owner ? '' : 'none';
    route();
}
async function boot() {
    applyTheme(localStorage.getItem('admin_theme') || 'light');
    $('#lform').addEventListener('submit', async e => {
        e.preventDefault(); const b = $('#lbtn'); b.disabled = true; showLogin('');
        const { data, error } = await db.auth.signInWithPassword({ email: $('#lemail').value.trim().toLowerCase(), password: $('#lpass').value });
        b.disabled = false;
        if (error) { showLogin('البريد الإلكتروني أو كلمة المرور غير صحيحة.'); return; }
        await enter(data.session);
    });
    $('#outBtn').addEventListener('click', async () => { if (!confirm('هل أنت متأكد من تسجيل الخروج؟')) return; await db.auth.signOut({ scope: 'local' }); location.reload(); });
    $('#themeBtn').addEventListener('click', () => { const t = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; localStorage.setItem('admin_theme', t); applyTheme(t); });
    $('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('open'));
    addEventListener('hashchange', () => { $('#side').classList.remove('open'); if (!$('#app').hidden) route(); });
    const { data } = await db.auth.getSession();
    if (data.session) await enter(data.session); else showLogin();
}
function applyTheme(t) { document.body.setAttribute('data-theme', t); $('#themeBtn').textContent = t === 'dark' ? '☀️' : '🌙'; }

/* ---------- التنقل ---------- */
async function route() {
    const h = (location.hash || '#overview').slice(1).split('/'), name = h[0], arg = h[1];
    const base = { course: 'courses', exam: 'exams' }[name] || name, fn = VIEWS[name] || VIEWS.overview;
    $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.v === base));
    $('#title').textContent = TITLES[base] || 'لوحة التحكم';
    $('#view').innerHTML = '<div class="empty">جاري التحميل...</div>';
    try { await fn(arg); } catch (e) { console.error(e); $('#view').innerHTML = '<div class="err">تعذر تحميل الصفحة: ' + esc(e.message || e) + '<br>لو ده أول تشغيل، تأكد إنك شغّلت setup_admin.sql في Supabase.</div>'; }
}

/* ---------- نظرة عامة ---------- */
VIEWS.overview = async () => {
    const week = new Date(Date.now() - 7 * 864e5).toISOString();
    const [st, co, en, ex, at, pend, codes, newW, profs, recent] = await Promise.all([
        count('profiles'), count('courses'), count('enrollments'), count('quizzes'),
        count('quiz_attempts', q => q.neq('status', 'in_progress')), count('quiz_attempts', q => q.eq('status', 'pending_review')),
        count('activation_codes', q => q.is('used_by', null)), count('profiles', q => q.gte('created_at', week)),
        all(() => db.from('profiles').select('academic_year')),
        db.from('profiles').select('*').order('created_at', { ascending: false }).limit(8)
    ]);
    const byG = {}; profs.forEach(p => byG[p.academic_year] = (byG[p.academic_year] || 0) + 1);
    const k = (c, n, l) => '<div class="kpi ' + c + '"><b>' + n + '</b><span>' + l + '</span></div>';
    $('#view').innerHTML = '<div class="cards">' + k('k1', st, 'إجمالي الطلاب') + k('k2', newW, 'طلاب جدد (7 أيام)') + k('k3', co, 'الكورسات') + k('k4', en, 'الاشتراكات') + k('k5', ex, 'الامتحانات') + k('k6', at, 'محاولات الامتحانات') + k('k1', pend, 'مقالي بانتظار التصحيح') + k('k2', codes, 'أكواد غير مستخدمة') + '</div>'
        + '<div class="g2"><div class="card"><div class="sec" style="margin-top:0">الطلاب حسب الصف</div>' + tbl(['الصف', 'عدد الطلاب', 'النسبة'], GR.map(g => [g, byG[g] || 0, pct(byG[g] || 0, st) + '%'])) + '</div>'
        + '<div class="card"><div class="sec" style="margin-top:0">آخر المسجلين</div>' + tbl(['الاسم', 'الصف', 'التاريخ'], (recent.data || []).map(p => [esc(fullName(p)), esc(p.academic_year), fdd(p.created_at)])) + '</div></div>'
        + (pend ? '<div class="card"><b>📝 عندك ' + pend + ' محاولة فيها أسئلة مقالية بانتظار التصحيح.</b> <a class="btn sm main" href="#results">افتح التصحيح</a></div>' : '');
};
