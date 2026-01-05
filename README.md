# Open Bus → Supabase Daily Sync

סנכרון יומי אוטומטי של נתוני תחבורה ציבורית מ-Open Bus Stride API ל-Supabase.

## 🚀 תכונות

- ✅ **~50,000 תחנות** מעודכנות יומית
- ✅ **~30,000 קווים** מעודכנים יומית
- ✅ **טבלת city_relevant_stops** - string matching חכם למציאת תחנות
- ✅ סנכרון אוטומטי יומי דרך GitHub Actions
- ✅ **חינמי לגמרי** (6 שעות timeout!)

## 📋 דרישות

- חשבון GitHub (חינמי)
- חשבון Supabase (חינמי)
- מסד נתונים מוגדר (ראה `supabase_complete_schema.sql`)

## 🔧 התקנה

ראה **מדריך מפורט**: [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)

### תקציר:

1. Fork/Clone רפו זה
2. הגדר Secrets ב-GitHub:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
3. הרץ workflow ידנית לבדיקה
4. סנכרון אוטומטי יומי ב-02:00 UTC

## 🗃️ מבנה הנתונים

| טבלה | תיאור | כמות |
|------|-------|------|
| `stops` | כל התחנות | ~50,000 |
| `routes` | כל הקווים | ~30,000 |
| `city_relevant_stops` | קשרים עיר↔תחנה | ~100,000 |
| `rides` | דגימת נסיעות | 10,000 |

## 📊 שאילתות לדוגמה

```sql
-- תחנות רלוונטיות לעיר
SELECT * FROM get_relevant_stops_for_city('בית חורון', true);

-- קווים בתחנה
SELECT * FROM routes_at_stop(45231);

-- נסיעות ישירות
SELECT * FROM find_trips_between_stops(12345, 67890);
```

## ⏰ תזמון

Workflow רץ אוטומטית **כל יום בשעה 02:00 UTC** (04:00-05:00 בישראל).

לשינוי התזמון, ערוך `.github/workflows/daily-sync.yml`.

## 📝 לוגים

צפה בלוגים: **GitHub → Actions tab**

## 🛠️ פתרון בעיות

ראה [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md) → פתרון בעיות

## 📄 רישיון

MIT
