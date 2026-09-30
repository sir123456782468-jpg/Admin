/* ===== الكورسات + الدروس (فيديو + PDF + صورة الكورس) ===== */
let COURSES = [], CUR = null, LESSONS = [];

VIEWS.courses = async () => {
    const { data, error } = await db.from('courses').select('*, lessons(count), enrollments(count)').order('academic_year').order('sort_order');
    if (error) throw error;
    COURSES = data;
    $('#view').innerHTML = '<div class="bar"><select id="fg">' + gOpts(true) + '</select><span class="sp"></span><button class="btn main" data-act="editCourse" data-id="">＋ كورس جديد</button></div><div id="list"></div>';
    const draw = () => {
        const g = $('#fg').value;
        $('#list').innerHTML = tbl(['الصورة', 'الكورس', 'الصف', 'السعر', 'الحالة', 'الدروس', 'المشتركين', 'إجراءات'],
            COURSES.filter(c => !g || c.academic_year === g).map(c => [
                c.thumbnail_url ? '<img class="thumb" src="' + esc(c.thumbnail_url) + '" alt="">' : '<span class="thumb"></span>',
                '<b>' + esc(c.title) + '</b>', esc(c.academic_year),
                Number(c.price) > 0 ? esc(c.price) + ' ج.م' : bdg('مجاني', 'ok'),
                c.is_published ? bdg('منشور', 'ok') : bdg('مسودة'),
                c.lessons[0].count, c.enrollments[0].count,
                '<a class="btn sm main" href="#course/' + c.id + '">المحتوى</a> ' + btn('editCourse', c.id, 'تعديل') + ' ' + btn('delCourse', c.id, 'حذف', 'bad')
            ]), 'لا توجد كورسات. اضغط "كورس جديد" للبدء.');
    };
    $('#fg').addEventListener('change', draw); draw();
};

ACT.editCourse = id => {
    const c = COURSES.find(x => x.id === id) || { price: 0, sort_order: 0, is_published: false, academic_year: GR[5] };
    modal(id ? 'تعديل الكورس' : 'كورس جديد',
        fld('اسم الكورس', 'title', c.title, 'text', 'required') + area('الوصف', 'description', c.description)
        + '<div class="g2">' + sel('الصف الدراسي', 'academic_year', GR, c.academic_year) + fld('السعر بالجنيه (0 = مجاني)', 'price', c.price, 'number', 'min="0" step="1"') + '</div>'
        + '<div class="g2">' + fld('ترتيب العرض', 'sort_order', c.sort_order, 'number') + '<label class="f"><span>صورة الكورس</span><input type="file" name="file" accept="image/*"></label></div>'
        + (c.thumbnail_url ? '<img class="thumb" style="width:110px;height:70px;margin-bottom:10px" src="' + esc(c.thumbnail_url) + '" alt="">' : '')
        + '<input type="hidden" name="thumb" value="' + esc(c.thumbnail_url || '') + '">' + chk('منشور (يظهر للطلاب)', 'is_published', c.is_published),
        async (o, f) => {
            let thumb = o.thumb || null; const file = f.elements.file.files[0];
            if (file) thumb = pubUrl('course-media', await upload('course-media', file, 'thumbs'));
            const row = { title: o.title.trim(), description: o.description, academic_year: o.academic_year, price: +o.price || 0, sort_order: +o.sort_order || 0, is_published: o.is_published, thumbnail_url: thumb };
            const r = id ? await db.from('courses').update(row).eq('id', id) : await db.from('courses').insert(row);
            if (r.error) throw r.error; closeModal(); toast('تم حفظ الكورس'); VIEWS.courses();
        });
};
ACT.delCourse = async id => {
    if (!confirm('حذف الكورس هيمسح كل دروسه واشتراكاته وأكواده. متأكد؟')) return;
    const { error } = await db.from('courses').delete().eq('id', id);
    if (error) return toast(errMsg(error), true); toast('تم الحذف'); VIEWS.courses();
};

/* ---------- محتوى الكورس (الدروس) ---------- */
VIEWS.course = async id => {
    CUR = id;
    const [c, l] = await Promise.all([
        db.from('courses').select('*').eq('id', id).single(),
        db.from('lessons').select('*, lesson_content(video_url,notes,attachment_path)').eq('course_id', id).order('position')
    ]);
    if (c.error) throw c.error; if (l.error) throw l.error;
    LESSONS = l.data.map(x => { const lc = Array.isArray(x.lesson_content) ? x.lesson_content[0] : x.lesson_content; return Object.assign({}, x, { video_url: lc && lc.video_url, notes: lc && lc.notes, attachment_path: lc && lc.attachment_path }); });
    $('#view').innerHTML = '<div class="bar"><a class="btn sm ghost" href="#courses">→ رجوع للكورسات</a><h2 style="font-size:19px">' + esc(c.data.title) + '</h2>' + bdg(c.data.academic_year, 'info') + '<span class="sp"></span><button class="btn main" data-act="editLesson" data-id="">＋ درس جديد</button></div>'
        + '<div class="card muted">📌 الفيديو: حط رابط YouTube (غير مدرج Unlisted). الـ PDF بيترفع في مخزن خاص ومحمي ومش بيظهر إلا للمشتركين.</div>'
        + tbl(['#', 'الوحدة', 'الدرس', 'المدة', 'مجاني؟', 'فيديو', 'PDF', 'إجراءات'], LESSONS.map(x => [
            x.position, esc(x.section_title || '—'), '<b>' + esc(x.title) + '</b>', x.duration_minutes ? x.duration_minutes + ' د' : '—',
            x.is_free ? bdg('مجاني', 'ok') : bdg('للمشتركين'), x.video_url ? bdg('✓', 'ok') : bdg('—'), x.attachment_path ? bdg('✓', 'ok') : bdg('—'),
            btn('editLesson', x.id, 'تعديل') + ' ' + btn('delLesson', x.id, 'حذف', 'bad')]), 'لا توجد دروس بعد.');
};

ACT.editLesson = id => {
    const x = LESSONS.find(l => l.id === id) || { position: (LESSONS.reduce((m, l) => Math.max(m, l.position), 0) + 1), is_free: false };
    modal(id ? 'تعديل الدرس' : 'درس جديد',
        fld('عنوان الدرس', 'title', x.title, 'text', 'required') + '<div class="g2">' + fld('اسم الوحدة / الباب (اختياري)', 'section_title', x.section_title) + fld('الترتيب', 'position', x.position, 'number') + '</div>'
        + '<div class="g2">' + fld('المدة بالدقائق', 'duration_minutes', x.duration_minutes, 'number') + chk('درس مجاني (معاينة بدون اشتراك)', 'is_free', x.is_free) + '</div>'
        + fld('رابط الفيديو (YouTube)', 'video_url', x.video_url, 'url', 'placeholder="https://www.youtube.com/watch?v=..." dir="ltr"') + area('ملاحظات للطالب (اختياري)', 'notes', x.notes)
        + '<label class="f"><span>ملف PDF (مذكرة / ملزمة)</span><input type="file" name="file" accept="application/pdf"></label>'
        + (x.attachment_path ? '<div class="muted">يوجد ملف مرفوع حالياً. ' + chk('احذف الملف الحالي', 'rm_pdf', false) + '</div>' : ''),
        async (o, f) => {
            if (o.video_url && !/^https:\/\//.test(o.video_url)) throw new Error('رابط الفيديو لازم يبدأ بـ https://');
            const row = { course_id: CUR, title: o.title.trim(), section_title: o.section_title || null, position: +o.position || 0, is_free: o.is_free, duration_minutes: o.duration_minutes ? +o.duration_minutes : null };
            let lid = id;
            if (id) { const r = await db.from('lessons').update(row).eq('id', id); if (r.error) throw r.error; }
            else { const r = await db.from('lessons').insert(row).select('id').single(); if (r.error) throw r.error; lid = r.data.id; }
            let path = x.attachment_path || null; const file = f.elements.file.files[0];
            if ((o.rm_pdf || file) && path) { await db.storage.from('lesson-files').remove([path]); path = null; }
            if (file) path = await upload('lesson-files', file, CUR);
            const r2 = await db.from('lesson_content').upsert({ lesson_id: lid, video_url: o.video_url || null, notes: o.notes || null, attachment_path: path });
            if (r2.error) throw r2.error; closeModal(); toast('تم حفظ الدرس'); VIEWS.course(CUR);
        });
};
ACT.delLesson = async id => {
    if (!confirm('حذف الدرس؟')) return;
    const x = LESSONS.find(l => l.id === id);
    if (x && x.attachment_path) await db.storage.from('lesson-files').remove([x.attachment_path]);
    const { error } = await db.from('lessons').delete().eq('id', id);
    if (error) return toast(errMsg(error), true); toast('تم الحذف'); VIEWS.course(CUR);
};
