# מדריך ויזואלי: איפה ה-Workflow?

---

## 🔍 תרחיש א': אתה רואה את ה-Workflow

### מסך Actions שנראה כך:

```
┌─────────────────────────────────────────────────────────────┐
│  Code    Issues    Pull requests    Actions ✓    Settings  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📋 All workflows                   🔵 Run workflow ▼       │
│                                                               │
│  └── 📄 Daily Bus Data Sync                                 │
│                                                               │
│  [אין הרצות עדיין]                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**מה לעשות:**
1. לחץ על "Daily Bus Data Sync" בצד שמאל
2. לחץ על "Run workflow" (הכפתור הכחול בצד ימין)
3. פופאפ יופיע - לחץ שוב "Run workflow"
4. רענן את הדף - יופיע workflow חדש ברשימה

---

## ❌ תרחיש ב': אתה לא רואה שום Workflow

### מסך Actions שנראה כך:

```
┌─────────────────────────────────────────────────────────────┐
│  Code    Issues    Pull requests    Actions ✓    Settings  │
├─────────────────────────────────────────────────────────────�────┐
│                                                                   │
│  Get started with GitHub Actions                                 │
│                                                                   │
│  Automate, customize, and execute your software...               │
│                                                                   │
│  [כפתורי דוגמאות שונות]                                         │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**זה אומר:** הקובץ `.github/workflows/daily-sync.yml` לא קיים או שיש בו שגיאה!

---

## 🛠️ פתרון: העלאת הקובץ נכון

### דרך 1: העלאה ידנית דרך GitHub

1. **עבור לרפו הראשי**
2. **לחץ "Add file" → "Create new file"**
3. **בשדה שם הקובץ, כתוב:**
   ```
   .github/workflows/daily-sync.yml
   ```
   ⚠️ **חשוב:** GitHub יוצר אוטומטית את התיקיות כשאתה כותב `/`

4. **העתק את כל התוכן מהקובץ למטה** ⬇️
5. **Commit changes**

---

## 📄 תוכן הקובץ המלא

```yaml
name: Daily Bus Data Sync

on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  sync-bus-data:
    runs-on: ubuntu-latest
    timeout-minutes: 360
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run sync script
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: node scripts/sync-bus-data.js
      
      - name: Upload logs (if failed)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: sync-logs
          path: logs/
          retention-days: 7
```

---

## ✅ אחרי שיצרת את הקובץ

**רענן את עמוד Actions** (F5)

**עכשיו אמור לראות:**

```
┌─────────────────────────────────────────────────────────────┐
│  📋 All workflows                                            │
│                                                               │
│  └── 📄 Daily Bus Data Sync    ← הופיע!                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**לחץ עליו ותראה:**
- 🔵 **Run workflow** (כפתור כחול למעלה/צד ימין)

---

## 🔍 בדיקה נוספת: האם יש שגיאה ב-YAML?

אם הקובץ קיים אבל לא מופיע ב-Actions, אולי יש שגיאת תחביר.

**בדוק:**
1. עבור לקובץ `.github/workflows/daily-sync.yml`
2. **האם יש סימן אדום ❌ ליד הקובץ?**
3. אם כן - לחץ עליו ותראה את השגיאה

**שגיאות נפוצות:**
- רווחים לא נכונים (YAML רגיש לרווחים!)
- טאבים במקום רווחים
- מרכאות לא סגורות

---

## 📸 איך זה אמור להיראות (צעד אחר צעד)

### צעד 1: עמוד ראשי של Repo
```
Code  Issues  Pull requests  [Actions] ← לחץ כאן
                                ^^^^^^
```

### צעד 2: בתוך Actions
```
┌──────────────────────────────────┐
│ All workflows (בצד שמאל)         │
│                                  │
│ 📄 Daily Bus Data Sync  ← לחץ   │
│                                  │
└──────────────────────────────────┘
```

### צעד 3: אחרי שלחצת על Workflow
```
┌────────────────────────────────────────────┐
│ Daily Bus Data Sync                        │
│                                            │
│          🔵 Run workflow ← לחץ כאן        │
│                                            │
│ This workflow has a workflow_dispatch...  │
└────────────────────────────────────────────┘
```

### צעד 4: פופאפ
```
┌──────────────────────────────┐
│ Use workflow from            │
│ Branch: main ▼               │
│                              │
│      🔵 Run workflow         │
│                              │
└──────────────────────────────┘
                ↑ לחץ כאן!
```

---

## 🆘 עדיין לא רואה?

העתק לי:

1. **האם התיקייה `.github/workflows/` קיימת?**
   - עבור לרפו → לחץ `.github` → האם יש `workflows/`?

2. **האם הקובץ `daily-sync.yml` קיים?**
   - צילום מסך של מבנה הקבצים

3. **מה אתה רואה בעמוד Actions?**
   - "Get started with GitHub Actions"?
   - או רשימת workflows ריקה?

ואני אעזור לפתור! 🚀
