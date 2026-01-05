# מדריך הגדרה: GitHub Actions Daily Sync
## פתרון לתוכנית החינמית (6 שעות timeout!)

---

## 🎯 למה GitHub Actions?

**הבעיה:**
- Edge Functions (Free): 150 שניות timeout ❌
- סנכרון מלא: 5-10 דקות לפחות ⚠️
- התחנות נטענות אבל לא נשמרות בזמן 😞

**הפתרון:**
- GitHub Actions: **6 שעות timeout** ✅
- **לגמרי חינמי** לריפוזיטוריות ציבוריות ✅
- 2,000 דקות/חודש לריפוזיטוריות פרטיות ✅
- אמין ויציב ✅

---

## 📋 צ'קליסט מהיר

- [ ] יצירת GitHub repository
- [ ] העלאת 4 קבצים
- [ ] הגדרת Secrets
- [ ] הפעלה ידנית לבדיקה
- [ ] ✅ סנכרון אוטומטי יומי!

---

## שלב 1: יצירת GitHub Repository

### אופציה א': דרך הממשק (קל יותר)

1. פתח [github.com/new](https://github.com/new)
2. שם לרפו: `open-bus-sync` (או כל שם אחר)
3. **Public** (חינמי לחלוטין) או **Private** (2,000 דקות/חודש)
4. ✅ סמן "Add a README file"
5. לחץ "Create repository"

### אופציה ב': דרך Git (אם אתה מכיר)

```bash
mkdir open-bus-sync
cd open-bus-sync
git init
git remote add origin https://github.com/YOUR_USERNAME/open-bus-sync.git
```

---

## שלב 2: העלאת הקבצים

### מבנה התיקיות (חשוב!):

```
open-bus-sync/
├── .github/
│   └── workflows/
│       └── daily-sync.yml          ← קובץ 1
├── scripts/
│   └── sync-bus-data.js            ← קובץ 2
├── package.json                     ← קובץ 3
└── README.md                        ← קובץ 4 (אופציונלי)
```

### העלאה דרך הממשק:

1. **ב-GitHub, עבור לרפו שלך**
2. **יצירת תיקיות וקבצים:**

**קובץ 1: `.github/workflows/daily-sync.yml`**
- לחץ "Add file" → "Create new file"
- שם הקובץ: `.github/workflows/daily-sync.yml`
- העתק את התוכן מ-`daily-sync.yml`
- לחץ "Commit changes"

**קובץ 2: `scripts/sync-bus-data.js`**
- לחץ "Add file" → "Create new file"
- שם הקובץ: `scripts/sync-bus-data.js`
- העתק את התוכן מ-`sync-bus-data.js`
- לחץ "Commit changes"

**קובץ 3: `package.json`**
- לחץ "Add file" → "Create new file"
- שם הקובץ: `package.json`
- העתק את התוכן מ-`package.json`
- לחץ "Commit changes"

---

## שלב 3: הגדרת Secrets (חשוב מאוד!)

**Secrets** הם משתני סביבה מוצפנים שאף אחד לא יכול לראות.

### איפה למצוא את הערכים?

1. **SUPABASE_URL:**
   - Supabase Dashboard → Settings → API
   - תחת "Project URL"
   - דוגמה: `https://abcdefghijklmnop.supabase.co`

2. **SUPABASE_SERVICE_KEY:**
   - Supabase Dashboard → Settings → API
   - תחת "Project API keys" → `service_role` key
   - **חשוב:** זה ה-**service_role**, לא ה-anon key!
   - מתחיל ב-`eyJhbGci...`

### הגדרה ב-GitHub:

1. **עבור לרפו ב-GitHub**
2. **Settings** (למעלה)
3. **Secrets and variables** → **Actions** (בצד שמאל)
4. **New repository secret**

**הוסף 2 secrets:**

**Secret 1:**
- Name: `SUPABASE_URL`
- Secret: `https://YOUR_PROJECT_REF.supabase.co`
- לחץ "Add secret"

**Secret 2:**
- Name: `SUPABASE_SERVICE_KEY`
- Secret: `eyJhbGci...` (ה-service role key המלא)
- לחץ "Add secret"

---

## שלב 4: בדיקה - הפעלה ידנית

### הרצה ידנית (לפני שמחכים לתזמון):

1. **עבור לרפו ב-GitHub**
2. **Actions** tab (למעלה)
3. **Daily Bus Data Sync** (בצד שמאל)
4. **Run workflow** (כפתור כחול בצד ימין)
5. **Run workflow** (אישור)

### מעקב:

- תראה workflow חדש רץ
- לחץ עליו כדי לראות לוגים בזמן אמת
- אמור לראות:

```
[timestamp] 📥 טוען תחנות מ-Open Bus API...
[timestamp]    נטענו 5,000 תחנות...
[timestamp]    נטענו 10,000 תחנות...
...
[timestamp] ✅ נטענו 50,000 תחנות
[timestamp] 💾 מסנכרן תחנות ל-Supabase...
[timestamp]    הוכנסו 1,000 / 50,000 תחנות
...
```

**אם הכל עובד:** ✅ אתה אמור לראות את הנתונים ב-Supabase!

---

## שלב 5: בדיקה ב-Supabase

### בדוק שהנתונים נשמרו:

```sql
-- 1. ספור תחנות
SELECT COUNT(*) FROM stops;
-- צפוי: ~50,000

-- 2. ספור קווים
SELECT COUNT(*) FROM routes;
-- צפוי: ~30,000

-- 3. ספור קשרי עיר-תחנה
SELECT COUNT(*) FROM city_relevant_stops;
-- צפוי: ~100,000

-- 4. בדוק תחנה ספציפית
SELECT * FROM stops WHERE name LIKE '%דיזנגוף%' LIMIT 5;

-- 5. בדוק קשרים לבית חורון
SELECT * FROM city_relevant_stops WHERE city = 'בית חורון';
```

---

## שלב 6: תזמון אוטומטי (כבר מוגדר!)

ה-workflow כבר מוגדר לרוץ **אוטומטית כל יום בשעה 02:00 UTC**:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # יומי 02:00 UTC
```

### זמני ריצה בישראל:
- **חורף (IST = UTC+2):** 02:00 UTC = **04:00 בבוקר**
- **קיץ (IDT = UTC+3):** 02:00 UTC = **05:00 בבוקר**

### שינוי זמן התזמון (אופציונלי):

ערוך את `.github/workflows/daily-sync.yml`:

```yaml
# דוגמאות:
- cron: '0 6 * * *'   # 06:00 UTC (08:00-09:00 בישראל)
- cron: '0 */6 * * *' # כל 6 שעות
- cron: '0 3 * * 1-5' # ימי חול בלבד, 03:00 UTC
```

---

## 🔍 מעקב והתראות

### צפייה בהיסטוריית הרצות:

1. GitHub → Actions tab
2. רשימת הרצות
3. ירוק ✅ = הצליח
4. אדום ❌ = נכשל

### לוגים מפורטים:

- לחץ על הרצה
- לחץ על "sync-bus-data"
- רוח לוגים מפורטים

### התראות באימייל (אוטומטי):

GitHub שולח אימייל אוטומטית אם workflow נכשל.

---

## ⚙️ הגדרות מתקדמות

### שינוי תדירות:

**יומי:**
```yaml
- cron: '0 2 * * *'
```

**פעמיים ביום:**
```yaml
schedule:
  - cron: '0 2 * * *'
  - cron: '0 14 * * *'
```

**שבועי (יום ראשון בלבד):**
```yaml
- cron: '0 2 * * 0'
```

### הגדלת timeout (אם צריך):

```yaml
timeout-minutes: 360  # 6 שעות (מקסימום ב-GitHub)
```

---

## 🛠️ פתרון בעיות

### 1. Workflow לא רץ אוטומטית

**בדיקה:**
- Actions tab → יש workflow בשם "Daily Bus Data Sync"?
- Settings → Actions → General → "Allow all actions" מסומן?

**פתרון:**
- ריפוזיטוריות חדשות לפעמים דורשות הפעלה ידנית ראשונה
- הרץ פעם אחת ידנית (Run workflow)

---

### 2. שגיאה: "Error: Missing environment variable"

**זה אומר:** secrets לא מוגדרים נכון.

**פתרון:**
1. Settings → Secrets and variables → Actions
2. ודא שיש 2 secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
3. **שימו לב:** אותיות גדולות/קטנות חשובות!

---

### 3. Timeout אחרי 6 שעות

**זה לא אמור לקרות!** הסנכרון צריך לקחת 5-10 דקות.

**אם קרה:**
- בדוק לוגים - איפה התקע?
- אולי בעיה ב-API של Open Bus
- נסה להריץ שוב

---

### 4. הנתונים לא מתעדכנים

**בדיקה:**
```sql
SELECT MAX(synced_at) FROM stops;
-- האם זה היום?
```

**אם לא:**
- בדוק Actions tab - האם workflow רץ?
- בדוק לוגים - האם היו שגיאות?

---

## 💰 עלויות

| סוג רפו | דקות/חודש | מחיר |
|---------|-----------|------|
| **Public** | ∞ ללא הגבלה | **חינמי לגמרי!** |
| **Private** | 2,000 | **חינמי** |
| **Private** (מעבר ל-2,000) | כל 1,000 דקות | $0.008/דקה |

**הערכה שלנו:**
- סנכרון אחד: ~5-10 דקות
- 30 ימים × 10 דקות = **300 דקות/חודש**
- **לגמרי חינמי!** ✅

---

## 📊 סטטיסטיקות צפויות

אחרי הרצה ראשונה מוצלחת:

```sql
SELECT 
  (SELECT COUNT(*) FROM stops) as stops,
  (SELECT COUNT(*) FROM routes) as routes,
  (SELECT COUNT(*) FROM rides) as rides,
  (SELECT COUNT(*) FROM city_relevant_stops) as city_relations;
```

**תוצאה צפויה:**
```
stops          | ~50,000
routes         | ~30,000
rides          | ~10,000
city_relations | ~100,000
```

---

## ✅ סיכום

**מה עשינו:**
1. ✅ יצרנו GitHub repo
2. ✅ העלינו 3 קבצים (workflow + script + package.json)
3. ✅ הגדרנו secrets (URL + Service Key)
4. ✅ הרצנו ידנית לבדיקה
5. ✅ תזמון אוטומטי יומי פעיל!

**תוצאה:**
- 🚀 סנכרון מלא עם 6 שעות timeout
- 💰 חינמי לגמרי
- 🔄 אוטומטי יומי
- 📊 כל הנתונים נשמרים!

---

## 🆘 עזרה

אם משהו לא עובד:
1. בדוק Actions tab → לוגים
2. בדוק שהחלפת את ה-secrets
3. העתק לי את הלוג המלא

מוכן לעבודה! 🎉
