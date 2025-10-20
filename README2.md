# أداة سحب منشورات صفحة فيسبوك (Facebook Page Scraper)

تطبيق Node.js صغير يقوم بجلب منشورات من صفحة فيسبوك عبر Facebook Graph API ويرسل بيانات مبسطة إلى Webhook.

الميزات:
- واجهة ويب بسيطة لإدخال رمز الوصول (Access Token)، ومعرّف الصفحة (Page ID)، وعنوان الـ Webhook.
- خيار لإرسال المنشورات مرة واحدة كـ Payload مجمّع أو إرسال كل منشور كطلب منفصل إلى الـ Webhook.
- إرسال بيانات مبسطة فقط: (النص/التعليق)، رابط الميديا الأول إن وجد، معرف المنشور، ورابط المنشور (إن أمكن).

---

## بدء سريع

1. تثبيت الحزم:
```bash
cd /home/sa/Desktop/scrap
npm install
```

2. تشغيل السيرفر:
```bash
npm run dev
# أو
npm start
```

3. افتح واجهة الويب:

افتح http://localhost:3000 في متصفحك.

4. املأ النموذج:
- Facebook Access Token: رمز وصول الصفحة أو رمز مستخدم بصلاحيات قراءة منشورات الصفحة.
- Facebook Page ID: معرف الصفحة الرقمي أو الاسم المستعار.
- Webhook URL: (اختياري) رابط الويب هوك الذي سيتم إرسال البيانات إليه. إذا تُرك فارغًا، سيُستخدم `WEBHOOK_URL` من ملف `.env` إذا كان موجودًا.
- "Send each post individually": تفعيل هذا الخيار لإرسال كل منشور في طلب منفصل، أو إيقافه لإرسال payload مجمّع واحد.

---

## واجهة برمجة التطبيقات: POST /scrape
يمكن استدعاء نقطة النهاية `/scrape` من الواجهة أو مباشرة عبر طلب HTTP.

جسم الطلب (JSON):
```
{
  "accessToken": "<FB_ACCESS_TOKEN>",
  "pageId": "<PAGE_ID>",
  "webhookUrl": "https://your-webhook.example/endpoint", // اختياري
  "sendIndividually": true|false // اختياري، القيمة الافتراضية false
}
```

الاستجابة (ناجح):
- إذا كان `sendIndividually: false` (مجمّع):
```
{ "success": true, "totalPosts": 23, "message": "Successfully scraped and sent 23 posts to webhook" }
```

- إذا كان `sendIndividually: true`:
```
{
  "success": true,
  "totalPosts": 23,
  "sent": 23,
  "failed": 0,
  "failures": []
}
```
إذا فشل بعض الإرسال، سيتضمن الحقل `failures` عناصر تحتوي على `{ index, id, error }`.

---

## شكل Payloads إلى Webhook

نرسل حقولًا محددة وسهلة المعالجة.

الوضع المجمّع (Bulk): سترسل الـ Webhook JSON مع ثلاث مصفوفات (بلا أرقام في أسماء المتغيرات):
```
{
  "message": ["caption1", "caption2", ...],
  "media_url": ["https://...", null, ...],
  "post_id": ["123_456", "789_012", ...],
  "post_url": ["https://www.facebook.com/...", ...]
}
```

الوضع الفردي (Individual): كل طلب يحتوي على كائن واحد فقط:
```
{
  "message": "caption text",
  "post_id": "123_456",
  "media_url": "https://...",
  "post_url": "https://www.facebook.com/..."
}
```

ملاحظات:
- `media_url` سيكون `null` إذا لم يكن هناك وسائط أو إذا لم يُستخرج رابط.
- `post_url` يتم إنشاؤه بشكل تقريبي اعتمادًا على `post_id` و`pageId`. للحصول على روابط دقيقة دائمًا يمكن طلب الحقل `permalink_url` من Graph API.

---

## الأذونات والرموز
- تستخدم الأداة نقطة النهاية `/PAGE_ID/posts` في Graph API. تحتاج رمز وصول يسمح بقراءة منشورات الصفحة (Page access token أو رمز مستخدم بصلاحيات مناسبة).
- في حال حصولك على أخطاء OAuth، تحقق من صلاحيات الرمز وكونه رمز صفحة إن أمكن.

---

## التكوين
- ملف `.env` (اختياري):
```
WEBHOOK_URL=https://your-default-webhook.example/endpoint
```
- القيم المدخلة عبر واجهة الويب تتجاوز قيم `.env` لهذه الطلبة فقط.

---

## مشاكل شائعة وحلول
- 404 من الـ Webhook: تأكد أن رابط الويب هوك صحيح وأنه يقبل POST بصيغة JSON.
- أخطاء المصادقة من فيسبوك: تحقق من صلاحيات الـ Access Token.
- نتائج فارغة: تحقق من أن Page ID صحيح وأن الرمز يسمح بقراءة المنشورات.
- سجلات السيرفر: راجع الطرفية التي تشغّل `npm run dev` للاطلاع على تقدم السحب ومحاولات الإرسال.

---

## تحسينات مقترحة
- إضافة محاولات إعادة الإرسال مع تراجع أُسّي (retries + exponential backoff).
- إضافة رؤوس مخصصة (Authorization) عند إرسال الـ Webhook.
- طلب `permalink_url` من Graph API لإرسال روابط دائمة دقيقة.
- حفظ سجل السحب محليًا أو في قاعدة بيانات.

---

أخبرني أي تحسينات تريد إضافتها وسأقوم بها.