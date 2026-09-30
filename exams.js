/* ===== الامتحانات: (كويز / امتحان كورس / امتحان شامل) + بنك الأسئلة (اختياري + مقالي) ===== */
let EXAMS = [], CURQ = null, QS = [], EXC = [];
const KIND = { quiz: 'كويز', course_exam: 'امتحان على الكورس', comprehensive: 'امتحان شامل' };

VIEWS.exams = async () => {
    const [q, c] = await Promise.all([db.from('quizzes').select('*, courses(title,academic_year), quiz_questions(count)').order('created_at', { ascending: false }), db.from('courses').select('id,title,academic_year').order('academic_year')]);
    if (q.error) throw q.error; EXAMS = q.data; EXC = c.data || [];
    $('#view').innerHTML = '<div class="bar"><select id="ek"><option value="">كل الأنواع</option>' + Object.keys(KIND).map(k => '<option value="' + k + '">' + KIND[k] + '</option>').join('') + '</select><select id="eg">' + gOpts(true) + '</select><input id="eq" placeholder="بحث باسم الامتحان"><span class="sp"></span><button class="btn main" data-act="editExam" data-id="">＋ امتحان جديد</button></div><div id="list"></div>';
    const draw = () => {
        const k = $('#ek').value, g = $('#eg').value, s = $('#eq').value.trim().toLowerCase();
        $('#list').innerHTML = tbl(['الامتحان', 'النوع', 'النطاق', 'الأسئلة', 'الوقت', 'المحاولات', 'النجاح', 'الحالة', 'إجراءات'], EXAMS.filter(e => (!k || e.kind === k) && (!g || (e.academic_year || (e.courses && e.courses.academic_year)) === g) && (!s || e.title.toLowerCase().includes(s))).map(e => [
            '<b>' + esc(e.title) + '</b>', bdg(KIND[e.kind] || e.kind, e.kind === 'comprehensive' ? 'info' : e.kind === 'course_exam' ? 'warn' : ''),
            esc(e.kind === 'comprehensive' ? 'كل طلاب ' + e.academic_year : (e.courses ? e.courses.title : '—')), e.quiz_questions[0].count, e.duration_minutes ? e.duration_minutes + ' د' : 'مفتوح', e.max_attempts > 0 ? e.max_attempts : '∞', e.pass_percent + '%',
            e.is_published ? bdg('منشور', 'ok') : bdg('مسودة'),
            '<a class="btn sm main" href="#exam/' + e.id + '">الأسئلة</a> <a class="btn sm" href="#results/' + e.id + '">النتائج</a> ' + btn('editExam', e.id, 'تعديل') + ' ' + btn('pubExam', e.id, e.is_published ? 'إخفاء' : 'نشر') + ' ' + btn('delExam', e.id, 'حذف', 'bad')]), 'لا توجد امتحانات.');
    };
    ['ek', 'eg'].forEach(i => $('#' + i).addEventListener('change', draw)); $('#eq').addEventListener('input', draw); draw();
};

ACT.editExam = id => {
    const e = EXAMS.find(x => x.id === id) || { kind: 'quiz', pass_percent: 50, max_attempts: 1, shuffle: true, show_result: true, is_published: false, duration_minutes: '' };
    modal(id ? 'تعديل الامتحان' : 'امتحان جديد',
        fld('اسم الامتحان', 'title', e.title, 'text', 'required') + sel('نوع الامتحان', 'kind', Object.keys(KIND).map(k => [k, KIND[k]]), e.kind)
        + '<div id="kc">' + sel('الكورس التابع له', 'course_id', EXC.map(c => [c.id, c.title + ' — ' + c.academic_year]), e.course_id) + '</div>'
        + '<div id="kg">' + sel('الصف (للامتحان الشامل)', 'academic_year', GR, e.academic_year || GR[5]) + '</div>'
        + '<div class="g2">' + fld('المدة بالدقائق (فاضي = بدون وقت)', 'duration_minutes', e.duration_minutes, 'number', 'min="1"') + fld('عدد المحاولات (0 = غير محدود)', 'max_attempts', e.max_attempts, 'number', 'min="0"') + '</div>'
        + '<div class="g2">' + fld('درجة النجاح %', 'pass_percent', e.pass_percent, 'number', 'min="0" max="100"') + '<div></div></div>'
        + area('تعليمات تظهر للطالب قبل البدء', 'instructions', e.instructions)
        + chk('ترتيب الأسئلة والاختيارات عشوائي لكل طالب (يمنع الغش)', 'shuffle', e.shuffle) + chk('إظهار الدرجة للطالب بعد التسليم', 'show_result', e.show_result) + chk('منشور (يظهر للطلاب)', 'is_published', e.is_published),
        async o => {
            const comp = o.kind === 'comprehensive';
            if (!comp && !o.course_id) throw new Error('اختار الكورس');
            const row = { title: o.title.trim(), kind: o.kind, course_id: comp ? null : o.course_id, academic_year: comp ? o.academic_year : null, duration_minutes: o.duration_minutes ? +o.duration_minutes : null, max_attempts: +o.max_attempts || 0, pass_percent: +o.pass_percent || 0, instructions: o.instructions || null, shuffle: o.shuffle, show_result: o.show_result, is_published: o.is_published };
            const r = id ? await db.from('quizzes').update(row).eq('id', id) : await db.from('quizzes').insert(row);
            if (r.error) throw r.error; closeModal(); toast('تم حفظ الامتحان'); VIEWS.exams();
        }, { init: f => { const t = () => { const c = f.elements.kind.value === 'comprehensive'; $('#kc').style.display = c ? 'none' : ''; $('#kg').style.display = c ? '' : 'none'; }; f.elements.kind.addEventListener('change', t); t(); } });
};
ACT.pubExam = async id => { const e = EXAMS.find(x => x.id === id); const { error } = await db.from('quizzes').update({ is_published: !e.is_published }).eq('id', id); if (error) return toast(errMsg(error), true); VIEWS.exams(); };
ACT.delExam = async id => { if (!confirm('حذف الامتحان هيمسح أسئلته ونتائج كل الطلاب فيه. متأكد؟')) return; const { error } = await db.from('quizzes').delete().eq('id', id); if (error) return toast(errMsg(error), true); toast('تم الحذف'); VIEWS.exams(); };

/* ---------- بنك أسئلة الامتحان ---------- */
VIEWS.exam = async id => {
    CURQ = id;
    const [e, q] = await Promise.all([db.from('quizzes').select('*').eq('id', id).single(), db.from('quiz_questions').select('*, quiz_answers(correct_index,model_answer)').eq('quiz_id', id).order('position')]);
    if (e.error) throw e.error; if (q.error) throw q.error;
    QS = q.data.map(x => { const a = Array.isArray(x.quiz_answers) ? x.quiz_answers[0] : x.quiz_answers; return Object.assign({}, x, { correct_index: a && a.correct_index, model_answer: a && a.model_answer }); });
    const pts = QS.reduce((s, x) => s + Number(x.points), 0);
    $('#view').innerHTML = '<div class="bar"><a class="btn sm ghost" href="#exams">→ رجوع</a><h2 style="font-size:19px">' + esc(e.data.title) + '</h2>' + bdg(KIND[e.data.kind], 'info') + bdg(QS.length + ' سؤال • ' + pts + ' درجة') + '<span class="sp"></span><button class="btn" data-act="bulkQ" data-id="">📥 إضافة أسئلة دفعة واحدة</button><button class="btn main" data-act="editQ" data-id="">＋ سؤال جديد</button></div>'
        + (QS.length ? QS.map((x, i) => '<div class="q"><div class="bar" style="margin:0">' + bdg('س' + (i + 1)) + bdg(x.qtype === 'mcq' ? 'اختياري' : 'مقالي', x.qtype === 'mcq' ? 'info' : 'warn') + bdg(x.points + ' درجة') + '<span class="sp"></span>' + btn('editQ', x.id, 'تعديل') + btn('delQ', x.id, 'حذف', 'bad') + '</div>'
            + (x.passage ? '<div class="muted" style="margin-top:8px;white-space:pre-wrap;direction:auto">📖 ' + esc(x.passage) + '</div>' : '') + '<h4 dir="auto">' + esc(x.question) + '</h4>' + (x.image_url ? '<img src="' + esc(x.image_url) + '" style="max-height:120px;border-radius:10px" alt="">' : '')
            + (x.qtype === 'mcq' ? (x.options || []).map((o, j) => '<div class="op ' + (j === x.correct_index ? 'ok' : '') + '">' + esc(o) + (j === x.correct_index ? ' ✓' : '') + '</div>').join('') : '<div class="muted">الإجابة النموذجية: ' + esc(x.model_answer || '— لم تُكتب —') + '</div>') + '</div>').join('') : '<div class="empty">لا توجد أسئلة. اضغط "سؤال جديد" أو "إضافة أسئلة دفعة واحدة".</div>');
};

ACT.editQ = id => {
    const x = QS.find(q => q.id === id) || { qtype: 'mcq', points: 1, position: QS.reduce((m, q) => Math.max(m, q.position), 0) + 1, options: ['', '', '', ''], correct_index: 0 };
    modal(id ? 'تعديل السؤال' : 'سؤال جديد',
        '<div class="g2">' + sel('نوع السؤال', 'qtype', [['mcq', 'اختياري (MCQ)'], ['essay', 'مقالي']], x.qtype) + fld('الدرجة', 'points', x.points, 'number', 'min="0.5" step="0.5"') + '</div>'
        + area('قطعة / Passage (اختياري، للقراءة)', 'passage', x.passage, 'dir="auto" rows="4"') + area('نص السؤال', 'question', x.question, 'required dir="auto"')
        + '<label class="f"><span>صورة للسؤال (اختياري)</span><input type="file" name="file" accept="image/*"></label><input type="hidden" name="img" value="' + esc(x.image_url || '') + '">'
        + '<div id="qm">' + area('الاختيارات (كل اختيار في سطر)', 'options', (x.options || []).join('\n'), 'dir="ltr" rows="5"') + fld('رقم الإجابة الصحيحة (1 = أول سطر)', 'correct', (x.correct_index == null ? 0 : x.correct_index) + 1, 'number', 'min="1"') + '</div>'
        + '<div id="qe">' + area('الإجابة النموذجية للمقالي (للمدرس فقط، لا تظهر للطالب)', 'model', x.model_answer, 'rows="3"') + '</div>' + fld('الترتيب', 'position', x.position, 'number'),
        async (o, f) => {
            const mcq = o.qtype === 'mcq'; let opts = null, correct = null;
            if (mcq) { opts = o.options.split('\n').map(s => s.trim()).filter(Boolean); correct = (+o.correct || 1) - 1; if (opts.length < 2) throw new Error('اكتب اختيارين على الأقل'); if (correct < 0 || correct >= opts.length) throw new Error('رقم الإجابة الصحيحة خارج الاختيارات'); }
            let img = o.img || null; const file = f.elements.file.files[0]; if (file) img = pubUrl('course-media', await upload('course-media', file, 'questions'));
            const row = { quiz_id: CURQ, qtype: o.qtype, question: o.question.trim(), passage: o.passage || null, image_url: img, options: opts, points: +o.points || 1, position: +o.position || 0 };
            let qid = id;
            if (id) { const r = await db.from('quiz_questions').update(row).eq('id', id); if (r.error) throw r.error; } else { const r = await db.from('quiz_questions').insert(row).select('id').single(); if (r.error) throw r.error; qid = r.data.id; }
            const r2 = await db.from('quiz_answers').upsert({ question_id: qid, correct_index: correct, model_answer: mcq ? null : (o.model || null) });
            if (r2.error) throw r2.error; closeModal(); toast('تم حفظ السؤال'); VIEWS.exam(CURQ);
        }, { wide: true, init: f => { const t = () => { const m = f.elements.qtype.value === 'mcq'; $('#qm').style.display = m ? '' : 'none'; $('#qe').style.display = m ? 'none' : ''; }; f.elements.qtype.addEventListener('change', t); t(); } });
};
ACT.delQ = async id => { if (!confirm('حذف السؤال؟')) return; const { error } = await db.from('quiz_questions').delete().eq('id', id); if (error) return toast(errMsg(error), true); toast('تم الحذف'); VIEWS.exam(CURQ); };

/* إضافة أسئلة دفعة واحدة: سطر السؤال ثم الاختيارات، والإجابة الصحيحة يبدأ سطرها بـ * ، وسطر فاضي بين كل سؤال */
function parseBulk(t) {
    return t.split(/\n\s*\n/).map(b => b.split('\n').map(s => s.trim()).filter(Boolean)).filter(l => l.length >= 3).map(l => {
        const opts = l.slice(1).map(s => s.replace(/^\*\s*/, '')), ci = l.slice(1).findIndex(s => s.startsWith('*'));
        return { question: l[0], options: opts, correct: ci };
    });
}
ACT.bulkQ = () => {
    modal('📥 إضافة أسئلة دفعة واحدة',
        '<div class="card muted" style="margin-bottom:10px">الصيغة: سطر للسؤال ثم كل اختيار في سطر، وضع <b>*</b> قبل الإجابة الصحيحة، وسطر فاضي بين كل سؤال.<br><span dir="ltr" style="display:block;margin-top:6px;text-align:left">She ___ a doctor.<br>are<br>*is<br>am<br>be<br><br>Choose the synonym of "big":<br>*large<br>tiny<br>thin</span></div>'
        + area('الأسئلة', 'bulk', '', 'rows="12" dir="ltr" required') + fld('درجة كل سؤال', 'points', 1, 'number', 'min="0.5" step="0.5"'),
        async o => {
            const list = parseBulk(o.bulk); if (!list.length) throw new Error('مفيش أسئلة صالحة. تأكد من الصيغة.');
            const bad = list.findIndex(x => x.correct < 0); if (bad >= 0) throw new Error('السؤال رقم ' + (bad + 1) + ' مفيهوش إجابة صحيحة (حط * قبلها)');
            let pos = QS.reduce((m, q) => Math.max(m, q.position), 0);
            const r = await db.from('quiz_questions').insert(list.map(x => ({ quiz_id: CURQ, qtype: 'mcq', question: x.question, options: x.options, points: +o.points || 1, position: ++pos }))).select('id');
            if (r.error) throw r.error;
            const r2 = await db.from('quiz_answers').insert(r.data.map((q, i) => ({ question_id: q.id, correct_index: list[i].correct })));
            if (r2.error) throw r2.error; closeModal(); toast('تمت إضافة ' + list.length + ' سؤال ✅'); VIEWS.exam(CURQ);
        }, { wide: true, save: 'إضافة الأسئلة' });
};
