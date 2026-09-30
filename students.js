/* ===== الطلاب + الأجهزة + الاشتراكات والأكواد ===== */
let STU = [], ENRC = {}, CURSTU = null, ALLC = [];

function devInfo(d) {
    const ua = (d && d.ua) || '', os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '؟';
    const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '؟';
    return os + ' • ' + br + (d && d.screen ? ' • ' + d.screen : '');
}
const waLink = p => p ? '<a href="https://wa.me/20' + esc(String(p).replace(/^0/, '')) + '" target="_blank" rel="noopener" dir="ltr" style="color:#16a34a;font-weight:800">' + esc(p) + '</a>' : '—';

VIEWS.students = async () => {
    const [p, e] = await Promise.all([all(() => db.from('profiles').select('*').order('created_at', { ascending: false })), all(() => db.from('enrollments').select('student_id'))]);
    STU = p; ENRC = {}; e.forEach(r => ENRC[r.student_id] = (ENRC[r.student_id] || 0) + 1);
    $('#view').innerHTML = '<div class="bar"><select id="sg">' + gOpts(true) + '</select>'
        + '<select id="ss"><option value="">كل الحالات</option><option value="a">نشط</option><option value="b">موقوف</option></select><input id="sq" placeholder="بحث بالاسم / الهاتف / الإيميل"><span class="sp"></span><span class="muted" id="sc"></span><button class="btn sm ghost" id="sx">⬇ تصدير Excel</button></div><div id="list"></div>';
    const cur = () => { const g = $('#sg').value, s = $('#ss').value, q = $('#sq').value.trim().toLowerCase(); return STU.filter(x => (!g || x.academic_year === g) && (!s || (s === 'b') === !!x.is_blocked) && (!q || (fullName(x) + x.phone_number + x.parent_phone + x.email).toLowerCase().includes(q))); };
    const draw = () => {
        const l = cur(); $('#sc').textContent = l.length + ' طالب';
        $('#list').innerHTML = tbl(['الطالب', 'الصف', 'هاتفه', 'ولي الأمر', 'البريد', 'كورسات', 'انضم', 'الحالة', ''], l.slice(0, 300).map(x => [
            '<b>' + esc(fullName(x)) + '</b>', esc(x.academic_year), waLink(x.phone_number), waLink(x.parent_phone), '<span dir="ltr">' + esc(x.email) + '</span>', ENRC[x.id] || 0, fdd(x.created_at), x.is_blocked ? bdg('موقوف', 'bad') : bdg('نشط', 'ok'), btn('student', x.id, 'عرض', 'main')]), 'لا يوجد طلاب مطابقين.')
            + (l.length > 300 ? '<div class="muted" style="margin-top:8px">معروض أول 300 نتيجة، استخدم البحث لتضييق النتائج.</div>' : '');
    };
    ['sg', 'ss'].forEach(i => $('#' + i).addEventListener('change', draw)); $('#sq').addEventListener('input', draw);
    $('#sx').addEventListener('click', () => csv('students', [['الاسم', 'الصف', 'الهاتف', 'هاتف ولي الأمر', 'البريد', 'تاريخ الانضمام', 'الحالة']].concat(cur().map(x => [fullName(x), x.academic_year, x.phone_number, x.parent_phone, x.email, fdd(x.created_at), x.is_blocked ? 'موقوف' : 'نشط']))));
    draw();
};

ACT.student = async id => {
    CURSTU = id;
    const s = STU.find(x => x.id === id) || (await db.from('profiles').select('*').eq('id', id).single()).data;
    const [en, pr, cs, at, lg] = await Promise.all([
        db.from('enrollments').select('course_id,created_at,courses(title,academic_year)').eq('student_id', id),
        db.from('lesson_progress').select('lessons(course_id)').eq('student_id', id),
        db.from('courses').select('id,title,academic_year,price,lessons(count)').order('academic_year'),
        db.from('quiz_attempts').select('id,score,total,status,created_at,tab_switches,quizzes(title,pass_percent)').eq('student_id', id).neq('status', 'in_progress').order('created_at', { ascending: false }),
        db.from('login_logs').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(25)
    ]);
    ALLC = cs.data || [];
    const done = {}; (pr.data || []).forEach(r => { const c = r.lessons && r.lessons.course_id; if (c) done[c] = (done[c] || 0) + 1; });
    const tot = {}; ALLC.forEach(c => tot[c.id] = c.lessons[0].count);
    const enIds = new Set((en.data || []).map(r => r.course_id)), devs = new Set((lg.data || []).map(l => l.device_id));
    modal('👤 ' + esc(fullName(s)),
        '<div class="kv"><div><small>الصف</small><b>' + esc(s.academic_year) + '</b></div><div><small>الهاتف</small><b>' + waLink(s.phone_number) + '</b></div><div><small>ولي الأمر</small><b>' + waLink(s.parent_phone) + '</b></div><div><small>البريد</small><b dir="ltr">' + esc(s.email) + '</b></div><div><small>انضم في</small><b>' + fdt(s.created_at) + '</b></div><div><small>الحالة</small><b>' + (s.is_blocked ? 'موقوف' : 'نشط') + '</b></div></div>'
        + '<div class="acts">' + btn('toggleBlock', id, s.is_blocked ? '✅ إلغاء الإيقاف' : '⛔ إيقاف الحساب', s.is_blocked ? 'main' : 'bad') + btn('resetDevice', id, '🔓 فك ارتباط الجهاز (يسمح بدخول جهاز جديد)') + '</div>'
        + '<div class="sec">الاشتراكات والتقدم</div>' + tbl(['الكورس', 'التقدم', 'منذ', ''], (en.data || []).map(r => { const t = tot[r.course_id] || 0, d = Math.min(done[r.course_id] || 0, t); return [esc(r.courses && r.courses.title), d + ' / ' + t + ' (' + pct(d, t) + '%)', fdd(r.created_at), btn('revoke', r.course_id, 'إلغاء الاشتراك', 'bad')]; }), 'غير مشترك في أي كورس')
        + '<div class="bar" style="margin-top:10px"><select id="gc" style="min-width:260px">' + ALLC.filter(c => !enIds.has(c.id)).map(c => '<option value="' + c.id + '">' + esc(c.title + ' — ' + c.academic_year + (Number(c.price) > 0 ? ' (' + c.price + ' ج)' : ' (مجاني)')) + '</option>').join('') + '</select>' + btn('grant', id, '＋ تفعيل الكورس للطالب (بدون دفع / كود)', 'main') + '</div>'
        + '<div class="sec">نتائج الامتحانات</div>' + tbl(['الامتحان', 'الدرجة', 'النسبة', 'الحالة', 'خروج من الصفحة', 'التاريخ', ''], (at.data || []).map(a => { const p = pct(a.score, a.total), ok = p >= ((a.quizzes && a.quizzes.pass_percent) || 50); return [esc(a.quizzes && a.quizzes.title), a.score + ' / ' + a.total, a.status === 'pending_review' ? '—' : p + '%', a.status === 'pending_review' ? bdg('قيد التصحيح', 'warn') : bdg(ok ? 'ناجح' : 'راسب', ok ? 'ok' : 'bad'), a.tab_switches ? bdg(a.tab_switches + ' مرة', 'warn') : '0', fdt(a.created_at), btn('attempt', a.id, 'التفاصيل')]; }), 'لم يمتحن بعد')
        + '<div class="sec">الأجهزة وتسجيل الدخول (' + devs.size + ' جهاز مختلف)</div>' + tbl(['الجهاز', 'معرّف الجهاز', 'الوقت'], (lg.data || []).map(l => [esc(devInfo(l.device)), '<span dir="ltr">' + esc(String(l.device_id || '').slice(0, 8)) + '</span>', fdt(l.created_at)]), 'لا يوجد سجل دخول'),
        null, { wide: true });
};
ACT.toggleBlock = async id => { const s = STU.find(x => x.id === id); const { error } = await db.from('profiles').update({ is_blocked: !s.is_blocked }).eq('id', id); if (error) return toast(errMsg(error), true); s.is_blocked = !s.is_blocked; toast('تم'); ACT.student(id); };
ACT.resetDevice = async id => { const { error } = await db.from('profiles').update({ active_session: null }).eq('id', id); if (error) return toast(errMsg(error), true); toast('تم فك ارتباط الجهاز'); };
ACT.grant = async id => { const c = $('#gc') && $('#gc').value; if (!c) return toast('اختار كورس', true); const { error } = await db.from('enrollments').insert({ student_id: id, course_id: c }); if (error) return toast(errMsg(error), true); toast('تم تفعيل الكورس للطالب ✅'); ACT.student(id); };
ACT.revoke = async cid => { if (!confirm('إلغاء اشتراك الطالب في الكورس؟')) return; const { error } = await db.from('enrollments').delete().eq('student_id', CURSTU).eq('course_id', cid); if (error) return toast(errMsg(error), true); toast('تم إلغاء الاشتراك'); ACT.student(CURSTU); };

/* ---------- الأجهزة وتسجيل الدخول ---------- */
VIEWS.devices = async () => {
    const [lg, pr] = await Promise.all([db.from('login_logs').select('*').order('created_at', { ascending: false }).limit(400), all(() => db.from('profiles').select('id,first_name,middle_name,last_name,academic_year,phone_number'))]);
    if (lg.error) throw lg.error;
    const P = {}; pr.forEach(p => P[p.id] = p); const by = {};
    lg.data.forEach(l => { (by[l.user_id] = by[l.user_id] || { devs: new Set(), n: 0 }).devs.add(l.device_id); by[l.user_id].n++; });
    const multi = Object.keys(by).filter(u => by[u].devs.size >= 3).sort((a, b) => by[b].devs.size - by[a].devs.size);
    $('#view').innerHTML = '<div class="card"><div class="sec" style="margin-top:0">⚠️ طلاب سجّلوا من 3 أجهزة مختلفة أو أكثر (آخر 400 عملية دخول)</div>'
        + tbl(['الطالب', 'الصف', 'الأجهزة', 'مرات الدخول', ''], multi.map(u => [esc(fullName(P[u])), esc(P[u] && P[u].academic_year), bdg(by[u].devs.size + ' أجهزة', 'warn'), by[u].n, btn('student', u, 'عرض')]), 'لا يوجد طلاب بأجهزة متعددة 👌') + '</div>'
        + '<div class="sec">آخر عمليات الدخول</div>' + tbl(['الطالب', 'الصف', 'الجهاز', 'معرّف الجهاز', 'الوقت'], lg.data.map(l => ['<b>' + esc(fullName(P[l.user_id])) + '</b>', esc(P[l.user_id] && P[l.user_id].academic_year), esc(devInfo(l.device)), '<span dir="ltr">' + esc(String(l.device_id || '').slice(0, 8)) + '</span>', fdt(l.created_at)]), 'لا توجد عمليات دخول مسجلة بعد.');
};

/* ---------- الاشتراكات والأكواد ---------- */
VIEWS.codes = async () => {
    const [cs, cd] = await Promise.all([db.from('courses').select('id,title,academic_year,price').order('academic_year'), db.from('activation_codes').select('code,created_at,used_at,course_id,courses(title,academic_year),used:profiles!used_by(first_name,middle_name,last_name,phone_number)').order('created_at', { ascending: false }).limit(500)]);
    if (cs.error) throw cs.error; if (cd.error) throw cd.error;
    const opts = cs.data.map(c => '<option value="' + c.id + '">' + esc(c.title + ' — ' + c.academic_year) + '</option>').join('');
    $('#view').innerHTML = '<div class="card"><div class="sec" style="margin-top:0">🎟️ توليد أكواد تفعيل لكورس</div><div class="bar"><select id="gcourse" style="min-width:260px">' + opts + '</select><input id="gn" type="number" min="1" max="500" value="20" style="width:110px"><button class="btn main" id="gbtn">توليد الأكواد</button></div><div id="gout"></div></div>'
        + '<div class="bar"><select id="fc"><option value="">كل الكورسات</option>' + opts + '</select><select id="fs"><option value="">كل الحالات</option><option value="u">غير مستخدم</option><option value="d">مستخدم</option></select><span class="sp"></span><button class="btn sm ghost" id="cx">⬇ تصدير الأكواد</button></div><div id="list"></div>';
    const cur = () => { const c = $('#fc').value, s = $('#fs').value; return cd.data.filter(x => (!c || x.course_id === c) && (!s || (s === 'd') === !!x.used_at)); };
    const draw = () => { $('#list').innerHTML = tbl(['الكود', 'الكورس', 'الحالة', 'استخدمه', 'وقت الاستخدام', 'تاريخ التوليد'], cur().map(x => ['<b dir="ltr">' + esc(x.code) + '</b>', esc(x.courses && x.courses.title), x.used_at ? bdg('مستخدم', 'bad') : bdg('متاح', 'ok'), esc(x.used ? fullName(x.used) : '—'), fdt(x.used_at), fdt(x.created_at)]), 'لا توجد أكواد.'); };
    ['fc', 'fs'].forEach(i => $('#' + i).addEventListener('change', draw)); draw();
    $('#cx').addEventListener('click', () => csv('codes', [['الكود', 'الكورس', 'الحالة', 'استخدمه', 'وقت الاستخدام']].concat(cur().map(x => [x.code, x.courses && x.courses.title, x.used_at ? 'مستخدم' : 'متاح', x.used ? fullName(x.used) : '', fdt(x.used_at)]))));
    $('#gbtn').addEventListener('click', async () => {
        const n = Math.max(1, Math.min(500, +$('#gn').value || 1)), b = $('#gbtn'); b.disabled = true;
        const { data, error } = await db.rpc('generate_codes', { p_course: $('#gcourse').value, p_count: n }); b.disabled = false;
        if (error) return toast(errMsg(error), true);
        $('#gout').innerHTML = '<div class="sec">تم توليد ' + data.length + ' كود (انسخها أو صدّرها):</div><textarea readonly dir="ltr" rows="6" id="gtxt">' + esc(data.join('\n')) + '</textarea><div class="acts"><button class="btn sm main" id="gcopy">📋 نسخ الكل</button><button class="btn sm ghost" id="gcsv">⬇ CSV</button></div>';
        $('#gcopy').onclick = () => { navigator.clipboard.writeText(data.join('\n')); toast('تم النسخ'); };
        $('#gcsv').onclick = () => csv('codes-new', [['الكود']].concat(data.map(c => [c])));
        toast('تم توليد الأكواد ✅');
    });
};
