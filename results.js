/* ===== النتائج + تصحيح المقالي + التقارير ===== */
let RES = [], CURRES = null;
const STAT = { pending_review: ['قيد التصحيح', 'warn'], graded: ['تم التصحيح', 'ok'] };
const pName = p => p ? fullName(p) : '—';

VIEWS.results = async qid => {
    const { data: qs, error } = await db.from('quizzes').select('id,title,kind,pass_percent,academic_year,courses(title,academic_year)').order('created_at', { ascending: false });
    if (error) throw error;
    const picker = '<div class="bar"><select id="rq" style="min-width:300px"><option value="">— اختار الامتحان —</option>' + qs.map(q => '<option value="' + q.id + '"' + (q.id === qid ? ' selected' : '') + '>' + esc(q.title + ' (' + (KIND[q.kind] || q.kind) + ')') + '</option>').join('') + '</select></div>';
    if (!qid) {
        const { data: pend } = await db.from('quiz_attempts').select('id,score,total,created_at,quizzes(title),profiles(first_name,middle_name,last_name,academic_year)').eq('status', 'pending_review').order('created_at');
        $('#view').innerHTML = picker + '<div class="card"><div class="sec" style="margin-top:0">📝 بانتظار تصحيح المقالي (' + (pend || []).length + ')</div>' + tbl(['الطالب', 'الصف', 'الامتحان', 'التاريخ', ''], (pend || []).map(a => ['<b>' + esc(pName(a.profiles)) + '</b>', esc(a.profiles && a.profiles.academic_year), esc(a.quizzes && a.quizzes.title), fdt(a.created_at), btn('attempt', a.id, 'صحّح', 'main')]), 'مفيش حاجة بانتظار التصحيح 🎉') + '</div>';
        $('#rq').addEventListener('change', e => { location.hash = e.target.value ? '#results/' + e.target.value : '#results'; }); return;
    }
    CURRES = qid; const qz = qs.find(q => q.id === qid);
    const [at, ans, ques] = await Promise.all([
        all(() => db.from('quiz_attempts').select('id,score,total,status,started_at,submitted_at,tab_switches,created_at,profiles(first_name,middle_name,last_name,academic_year,phone_number)').eq('quiz_id', qid).neq('status', 'in_progress').order('created_at', { ascending: false })),
        all(() => db.from('quiz_attempt_answers').select('question_id,is_correct,quiz_attempts!inner(quiz_id)').eq('quiz_attempts.quiz_id', qid)),
        db.from('quiz_questions').select('id,question,qtype,position').eq('quiz_id', qid).order('position')
    ]);
    RES = at; const done = at.filter(a => a.status === 'graded'), ps = done.map(a => pct(a.score, a.total));
    const avg = ps.length ? Math.round(ps.reduce((s, x) => s + x, 0) / ps.length) : 0, pass = ps.filter(p => p >= qz.pass_percent).length;
    const wrong = {}; ans.forEach(a => { const w = wrong[a.question_id] = wrong[a.question_id] || { n: 0, w: 0 }; if (a.is_correct !== null) { w.n++; if (!a.is_correct) w.w++; } });
    const k = (c, n, l) => '<div class="kpi ' + c + '"><b>' + n + '</b><span>' + l + '</span></div>';
    $('#view').innerHTML = picker + '<div class="cards">' + k('k1', at.length, 'عدد المحاولات') + k('k2', avg + '%', 'متوسط الدرجات') + k('k3', ps.length ? pct(pass, ps.length) + '%' : '—', 'نسبة النجاح') + k('k4', ps.length ? Math.max(...ps) + '%' : '—', 'أعلى درجة') + k('k5', ps.length ? Math.min(...ps) + '%' : '—', 'أقل درجة') + k('k6', at.length - done.length, 'بانتظار التصحيح') + '</div>'
        + '<div class="g2"><div class="card"><div class="sec" style="margin-top:0">🎯 أكثر الأسئلة غلطاً</div>' + tbl(['السؤال', 'نسبة الغلط'], (ques.data || []).filter(q => q.qtype === 'mcq' && wrong[q.id] && wrong[q.id].n).sort((a, b) => pct(wrong[b.id].w, wrong[b.id].n) - pct(wrong[a.id].w, wrong[a.id].n)).slice(0, 10).map(q => ['<span dir="auto">' + esc(q.question.slice(0, 70)) + '</span>', bdg(pct(wrong[q.id].w, wrong[q.id].n) + '% (' + wrong[q.id].w + '/' + wrong[q.id].n + ')', pct(wrong[q.id].w, wrong[q.id].n) > 50 ? 'bad' : 'warn')]), 'لا توجد بيانات كافية') + '</div>'
        + '<div class="card"><div class="sec" style="margin-top:0">📊 توزيع الدرجات</div>' + [['90% فأكثر', 90, 101], ['75 – 89%', 75, 90], ['50 – 74%', 50, 75], ['أقل من 50%', 0, 50]].map(b => { const n = ps.filter(p => p >= b[1] && p < b[2]).length; return '<div style="margin-bottom:10px"><div class="muted">' + b[0] + ' — ' + n + ' طالب</div><div style="height:9px;background:var(--line);border-radius:9px;overflow:hidden"><i style="display:block;height:100%;width:' + pct(n, ps.length) + '%;background:var(--grad)"></i></div></div>'; }).join('') + '</div></div>'
        + '<div class="bar"><span class="sp"></span><button class="btn sm ghost" id="rx">⬇ تصدير النتائج Excel</button></div>'
        + tbl(['الطالب', 'الصف', 'الهاتف', 'الدرجة', 'النسبة', 'الحالة', 'الزمن', 'خروج من الصفحة', 'التاريخ', ''], at.map(a => { const p = pct(a.score, a.total), t = a.submitted_at ? Math.max(1, Math.round((new Date(a.submitted_at) - new Date(a.started_at)) / 60000)) + ' د' : '—'; return ['<b>' + esc(pName(a.profiles)) + '</b>', esc(a.profiles && a.profiles.academic_year), waLink(a.profiles && a.profiles.phone_number), a.score + ' / ' + a.total, a.status === 'graded' ? bdg(p + '%', p >= qz.pass_percent ? 'ok' : 'bad') : '—', bdg(STAT[a.status][0], STAT[a.status][1]), t, a.tab_switches ? bdg(a.tab_switches + ' مرة', 'warn') : '0', fdt(a.created_at), btn('attempt', a.id, a.status === 'pending_review' ? 'صحّح' : 'تفاصيل', a.status === 'pending_review' ? 'main' : '')]; }), 'لا توجد محاولات بعد.');
    $('#rq').addEventListener('change', e => { location.hash = e.target.value ? '#results/' + e.target.value : '#results'; });
    $('#rx').addEventListener('click', () => csv('results-' + qz.title, [['الطالب', 'الصف', 'الهاتف', 'الدرجة', 'من', 'النسبة', 'الحالة', 'خروج من الصفحة', 'التاريخ']].concat(at.map(a => [pName(a.profiles), a.profiles && a.profiles.academic_year, a.profiles && a.profiles.phone_number, a.score, a.total, pct(a.score, a.total), STAT[a.status][0], a.tab_switches, fdt(a.created_at)]))));
};

/* تفاصيل محاولة + تصحيح المقالي */
ACT.attempt = async id => {
    const [a, r] = await Promise.all([
        db.from('quiz_attempts').select('*, quizzes(title,pass_percent), profiles(first_name,middle_name,last_name,academic_year,phone_number)').eq('id', id).single(),
        db.from('quiz_attempt_answers').select('*, quiz_questions(question,qtype,options,points,passage,position,quiz_answers(correct_index,model_answer))').eq('attempt_id', id)
    ]);
    if (a.error) return toast(errMsg(a.error), true);
    const rows = (r.data || []).sort((x, y) => x.quiz_questions.position - y.quiz_questions.position), p = pct(a.data.score, a.data.total);
    const body = '<div class="kv"><div><small>الطالب</small><b>' + esc(pName(a.data.profiles)) + '</b></div><div><small>الصف</small><b>' + esc(a.data.profiles && a.data.profiles.academic_year) + '</b></div><div><small>الدرجة</small><b>' + a.data.score + ' / ' + a.data.total + ' (' + p + '%)</b></div><div><small>الحالة</small><b>' + STAT[a.data.status][0] + '</b></div><div><small>خروج من صفحة الامتحان</small><b>' + a.data.tab_switches + ' مرة</b></div><div><small>التسليم</small><b>' + fdt(a.data.submitted_at) + '</b></div></div>'
        + rows.map((x, i) => {
            const q = x.quiz_questions, ka = Array.isArray(q.quiz_answers) ? q.quiz_answers[0] : q.quiz_answers;
            if (q.qtype === 'mcq') return '<div class="q"><div class="bar" style="margin:0">' + bdg('س' + (i + 1)) + bdg(x.is_correct ? 'صح ✓' : 'غلط ✗', x.is_correct ? 'ok' : 'bad') + bdg(q.points + ' درجة') + '</div><h4 dir="auto">' + esc(q.question) + '</h4>' + (q.options || []).map((o, j) => '<div class="op ' + (ka && j === ka.correct_index ? 'ok' : j === x.chosen_index ? 'bad' : '') + '">' + esc(o) + (j === x.chosen_index ? ' ← اختيار الطالب' : '') + '</div>').join('') + '</div>';
            return '<div class="q"><div class="bar" style="margin:0">' + bdg('س' + (i + 1)) + bdg('مقالي', 'warn') + bdg('من ' + q.points + ' درجة') + (x.points_awarded == null ? bdg('لم يُصحَّح', 'warn') : bdg('أخذ ' + x.points_awarded, 'ok')) + '</div><h4 dir="auto">' + esc(q.question) + '</h4><div class="card" style="margin:8px 0;white-space:pre-wrap;direction:auto">' + esc(x.answer_text || '— لم يجب —') + '</div>'
                + (ka && ka.model_answer ? '<div class="muted">✅ الإجابة النموذجية: ' + esc(ka.model_answer) + '</div>' : '')
                + '<div class="bar" style="margin-top:10px"><input type="number" id="pt-' + x.question_id + '" min="0" max="' + q.points + '" step="0.5" value="' + (x.points_awarded == null ? '' : x.points_awarded) + '" placeholder="الدرجة" style="width:110px"><input id="cm-' + x.question_id + '" value="' + esc(x.teacher_comment || '') + '" placeholder="تعليقك للطالب (اختياري)" style="flex:1"><button class="btn sm main" data-act="gradeQ" data-id="' + id + '|' + x.question_id + '">حفظ الدرجة</button></div></div>';
        }).join('');
    modal('📄 محاولة: ' + esc(a.data.quizzes && a.data.quizzes.title), body, null, { wide: true });
};
ACT.gradeQ = async v => {
    const [aid, qid] = v.split('|'), pv = $('#pt-' + qid).value;
    if (pv === '') return toast('اكتب الدرجة', true);
    const { error } = await db.rpc('admin_grade_essay', { p_attempt: aid, p_question: qid, p_points: +pv, p_comment: $('#cm-' + qid).value || null });
    if (error) return toast(errMsg(error), true); toast('تم حفظ الدرجة ✅'); ACT.attempt(aid); if (location.hash.startsWith('#results')) VIEWS.results(CURRES || undefined);
};

/* ---------- التقارير: لكل صف ولكل كورس ---------- */
VIEWS.reports = async () => {
    const [cs, en, pr, at, st] = await Promise.all([
        db.from('courses').select('id,title,academic_year,price,lessons(count)').order('academic_year'),
        all(() => db.from('enrollments').select('student_id,course_id')),
        all(() => db.from('lesson_progress').select('student_id,lessons(course_id)')),
        all(() => db.from('quiz_attempts').select('student_id,quiz_id,score,total,quizzes(course_id,kind,academic_year)').eq('status', 'graded')),
        all(() => db.from('profiles').select('id,academic_year'))
    ]);
    if (cs.error) throw cs.error;
    const done = {}; pr.forEach(r => { const c = r.lessons && r.lessons.course_id; if (!c) return; const k = c + '|' + r.student_id; done[k] = (done[k] || 0) + 1; });
    const best = {}; at.forEach(a => { const k = a.student_id + '|' + a.quiz_id, p = pct(a.score, a.total); if (!best[k] || p > best[k].p) best[k] = { p, c: a.quizzes && a.quizzes.course_id, g: a.quizzes && a.quizzes.kind === 'comprehensive' ? a.quizzes.academic_year : null }; });
    const stG = {}; st.forEach(s => stG[s.id] = s.academic_year);
    const courseRows = cs.data.map(c => {
        const enr = en.filter(e => e.course_id === c.id), tot = c.lessons[0].count;
        const prog = enr.length && tot ? Math.round(enr.reduce((s, e) => s + Math.min(done[c.id + '|' + e.student_id] || 0, tot), 0) / (tot * enr.length) * 100) : 0;
        const ex = Object.values(best).filter(b => b.c === c.id), ea = ex.length ? Math.round(ex.reduce((s, b) => s + b.p, 0) / ex.length) : null;
        return { c, n: enr.length, tot, prog, ea, nex: ex.length };
    });
    const gradeRows = GR.map(g => {
        const sids = st.filter(s => s.academic_year === g).map(s => s.id), ex = Object.entries(best).filter(([k, b]) => stG[k.split('|')[0]] === g).map(x => x[1]);
        return { g, n: sids.length, enr: en.filter(e => stG[e.student_id] === g).length, ea: ex.length ? Math.round(ex.reduce((s, b) => s + b.p, 0) / ex.length) : null };
    });
    $('#view').innerHTML = '<div class="bar"><span class="sp"></span><button class="btn sm ghost" id="cx">⬇ تصدير تقرير الكورسات</button></div>'
        + '<div class="card"><div class="sec" style="margin-top:0">📚 تقرير كل كورس</div>' + tbl(['الكورس', 'الصف', 'السعر', 'الدروس', 'المشتركين', 'متوسط التقدم', 'متوسط الامتحانات'], courseRows.map(r => ['<b>' + esc(r.c.title) + '</b>', esc(r.c.academic_year), Number(r.c.price) > 0 ? r.c.price + ' ج' : bdg('مجاني', 'ok'), r.tot, r.n, bdg(r.prog + '%', r.prog >= 50 ? 'ok' : 'warn'), r.ea == null ? '—' : bdg(r.ea + '% (' + r.nex + ' نتيجة)', r.ea >= 50 ? 'ok' : 'bad')]), 'لا توجد كورسات') + '</div>'
        + '<div class="card"><div class="sec" style="margin-top:0">🎓 تقرير كل صف</div>' + tbl(['الصف', 'الطلاب', 'الاشتراكات', 'متوسط الامتحانات'], gradeRows.map(r => ['<b>' + r.g + '</b>', r.n, r.enr, r.ea == null ? '—' : bdg(r.ea + '%', r.ea >= 50 ? 'ok' : 'bad')])) + '</div>'
        + '<div class="muted">ملحوظة: متوسط الامتحانات بيحسب أعلى درجة لكل طالب في كل امتحان، وبيشمل الامتحانات المصححة بس. "امتحان من أخطائي" خاص بالطالب ومش بيظهر هنا ولا في أي نسبة.</div>';
    $('#cx').addEventListener('click', () => csv('courses-report', [['الكورس', 'الصف', 'السعر', 'الدروس', 'المشتركين', 'متوسط التقدم %', 'متوسط الامتحانات %']].concat(courseRows.map(r => [r.c.title, r.c.academic_year, r.c.price, r.tot, r.n, r.prog, r.ea == null ? '' : r.ea]))));
};
