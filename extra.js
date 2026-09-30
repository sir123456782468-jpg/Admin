/* ===== الإعلانات + المشرفون (للـ Owner فقط) ===== */
let ANN = [];
VIEWS.announcements = async () => {
    const { data, error } = await db.from('announcements').select('*').order('created_at', { ascending: false });
    if (error) throw error; ANN = data;
    $('#view').innerHTML = '<div class="bar"><span class="muted">الإعلانات النشطة بتظهر للطلاب في الصفحة الرئيسية وفي الجرس.</span><span class="sp"></span><button class="btn main" data-act="editAnn" data-id="">＋ إعلان جديد</button></div>'
        + tbl(['العنوان', 'التفاصيل', 'الحالة', 'التاريخ', ''], ANN.map(a => ['<b>' + esc(a.title) + '</b>', esc(a.body || '—'), a.is_active ? bdg('ظاهر', 'ok') : bdg('مخفي'), fdt(a.created_at), btn('editAnn', a.id, 'تعديل') + ' ' + btn('togAnn', a.id, a.is_active ? 'إخفاء' : 'إظهار') + ' ' + btn('delAnn', a.id, 'حذف', 'bad')]), 'لا توجد إعلانات.');
};
ACT.editAnn = id => {
    const a = ANN.find(x => x.id === id) || { is_active: true };
    modal(id ? 'تعديل الإعلان' : 'إعلان جديد', fld('العنوان', 'title', a.title, 'text', 'required') + area('التفاصيل (اختياري)', 'body', a.body) + chk('ظاهر للطلاب', 'is_active', a.is_active),
        async o => { const row = { title: o.title.trim(), body: o.body || null, is_active: o.is_active }; const r = id ? await db.from('announcements').update(row).eq('id', id) : await db.from('announcements').insert(row); if (r.error) throw r.error; closeModal(); toast('تم الحفظ'); VIEWS.announcements(); });
};
ACT.togAnn = async id => { const a = ANN.find(x => x.id === id); const { error } = await db.from('announcements').update({ is_active: !a.is_active }).eq('id', id); if (error) return toast(errMsg(error), true); VIEWS.announcements(); };
ACT.delAnn = async id => { if (!confirm('حذف الإعلان؟')) return; const { error } = await db.from('announcements').delete().eq('id', id); if (error) return toast(errMsg(error), true); VIEWS.announcements(); };

VIEWS.admins = async () => {
    if (!ME.owner) { $('#view').innerHTML = '<div class="err">هذه الصفحة للمالك (Owner) فقط.</div>'; return; }
    const { data, error } = await db.rpc('admin_list_admins'); if (error) throw error;
    $('#view').innerHTML = '<div class="card"><div class="sec" style="margin-top:0">🛡️ إضافة مشرف</div><p class="muted" style="margin-bottom:10px">المشرف لازم يكون عامل حساب في المنصة الأول بنفس الإيميل. المشرف بيدخل لوحة التحكم ويتحكم في المحتوى والطلاب، لكن مش بيقدر يضيف أو يحذف مشرفين.</p><div class="bar"><input id="ae" type="email" dir="ltr" placeholder="email@example.com" style="min-width:280px"><button class="btn main" id="ab">إضافة مشرف</button></div></div>'
        + tbl(['البريد', 'الدور', 'منذ', ''], data.map(a => ['<span dir="ltr">' + esc(a.email) + '</span>', a.role === 'owner' ? bdg('المالك Owner', 'info') : bdg('مشرف Admin', 'ok'), fdd(a.created_at), a.role === 'owner' || a.user_id === ME.id ? '' : btn('rmAdmin', a.user_id, 'إزالة الصلاحية', 'bad')]));
    $('#ab').addEventListener('click', async () => {
        const e = $('#ae').value.trim(); if (!e) return; const { error } = await db.rpc('admin_add_admin', { p_email: e });
        if (error) return toast(errMsg(error), true); toast('تمت إضافة المشرف ✅'); VIEWS.admins();
    });
};
ACT.rmAdmin = async id => { if (!confirm('إزالة صلاحية هذا المشرف؟')) return; const { error } = await db.rpc('admin_remove_admin', { p_user: id }); if (error) return toast(errMsg(error), true); toast('تمت الإزالة'); VIEWS.admins(); };
