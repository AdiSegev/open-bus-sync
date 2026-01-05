#!/usr/bin/env node
/**
 * ============================================================================
 * GitHub Actions Daily Sync Script
 * ============================================================================
 * סקריפט סנכרון יומי מ-Open Bus Stride API ל-Supabase
 * רץ על GitHub Actions עם 6 שעות timeout
 * 
 * שימוש:
 * node scripts/sync-bus-data.js
 * ============================================================================
 */

const { createClient } = require('@supabase/supabase-js');

// ===============================
// הגדרות
// ===============================

const CONFIG = {
  API_BASE: 'https://open-bus-stride-api.hasadna.org.il',
  BATCH_SIZE: 1000,
  API_BATCH_SIZE: 5000,
  MAX_RIDES_SAMPLE: 10000,
  KEEP_DAYS: 7,
  DELAY_BETWEEN_BATCHES: 100,
};

// בדיקת משתני סביבה
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ חסרים משתני סביבה: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// אתחול Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// ===============================
// פונקציות עזר
// ===============================

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logError(message, error) {
  console.error(`[${new Date().toISOString()}] ❌ ${message}:`, error.message || error);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

// ===============================
// טעינה מ-API
// ===============================

async function loadAllStopsFromAPI(date) {
  log('📥 טוען תחנות מ-Open Bus API...');
  
  const stops = [];
  let offset = 0;
  
  while (true) {
    try {
      const url = new URL(`${CONFIG.API_BASE}/gtfs_stops/list`);
      url.searchParams.set('date', date);
      url.searchParams.set('limit', CONFIG.API_BATCH_SIZE);
      url.searchParams.set('offset', offset);
      url.searchParams.set('get_count', 'false');
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const batch = await response.json();
      
      if (!batch || batch.length === 0) break;
      
      stops.push(...batch);
      log(`   נטענו ${stops.length.toLocaleString()} תחנות...`);
      
      if (batch.length < CONFIG.API_BATCH_SIZE) break;
      
      offset += CONFIG.API_BATCH_SIZE;
      await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
      
    } catch (error) {
      logError('שגיאה בטעינת תחנות', error);
      throw error;
    }
  }
  
  log(`✅ נטענו ${stops.length.toLocaleString()} תחנות`);
  return stops;
}

async function loadAllRoutesFromAPI(date) {
  log('📥 טוען קווים מ-Open Bus API...');
  
  const routes = [];
  let offset = 0;
  
  while (true) {
    try {
      const url = new URL(`${CONFIG.API_BASE}/gtfs_routes/list`);
      url.searchParams.set('date', date);
      url.searchParams.set('limit', CONFIG.API_BATCH_SIZE);
      url.searchParams.set('offset', offset);
      url.searchParams.set('get_count', 'false');
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const batch = await response.json();
      
      if (!batch || batch.length === 0) break;
      
      routes.push(...batch);
      log(`   נטענו ${routes.length.toLocaleString()} קווים...`);
      
      if (batch.length < CONFIG.API_BATCH_SIZE) break;
      
      offset += CONFIG.API_BATCH_SIZE;
      await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
      
    } catch (error) {
      logError('שגיאה בטעינת קווים', error);
      throw error;
    }
  }
  
  log(`✅ נטענו ${routes.length.toLocaleString()} קווים`);
  return routes;
}

async function loadRidesSampleFromAPI(date, limit) {
  log(`📥 טוען ${limit.toLocaleString()} נסיעות לדוגמה...`);
  
  const rides = [];
  let offset = 0;
  
  while (rides.length < limit) {
    try {
      const url = new URL(`${CONFIG.API_BASE}/gtfs_rides/list`);
      url.searchParams.set('limit', Math.min(CONFIG.API_BATCH_SIZE, limit - rides.length));
      url.searchParams.set('offset', offset);
      url.searchParams.set('get_count', 'false');
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const batch = await response.json();
      
      if (!batch || batch.length === 0) break;
      
      const filteredBatch = batch.filter(ride => {
        if (!ride.start_time) return false;
        const rideDate = ride.start_time.split('T')[0];
        return rideDate === date;
      });
      
      rides.push(...filteredBatch);
      log(`   נטענו ${rides.length.toLocaleString()} נסיעות...`);
      
      if (batch.length < CONFIG.API_BATCH_SIZE || rides.length >= limit) break;
      
      offset += CONFIG.API_BATCH_SIZE;
      await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
      
    } catch (error) {
      logError('שגיאה בטעינת נסיעות', error);
      throw error;
    }
  }
  
  log(`✅ נטענו ${rides.length.toLocaleString()} נסיעות`);
  return rides;
}

// ===============================
// שמירה ב-Supabase
// ===============================

async function syncStopsToSupabase(stops, date) {
  log('💾 מסנכרן תחנות ל-Supabase...');
  
  const stopsData = stops.map(stop => ({
    id: stop.id,
    code: stop.code,
    name: stop.name,
    city: stop.city,
    lat: stop.lat,
    lon: stop.lon,
    location: `POINT(${stop.lon} ${stop.lat})`,
    date: date,
    synced_at: new Date().toISOString()
  }));
  
  let inserted = 0;
  for (let i = 0; i < stopsData.length; i += CONFIG.BATCH_SIZE) {
    const batch = stopsData.slice(i, i + CONFIG.BATCH_SIZE);
    
    const { error } = await supabase
      .from('stops')
      .upsert(batch, { onConflict: 'id,date' });
    
    if (error) {
      logError(`שגיאה בהכנסת תחנות batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}`, error);
      throw error;
    }
    
    inserted += batch.length;
    log(`   הוכנסו ${inserted.toLocaleString()} / ${stopsData.length.toLocaleString()} תחנות`);
    
    await sleep(50);
  }
  
  log(`✅ הושלם סנכרון ${stopsData.length.toLocaleString()} תחנות`);
}

async function syncRoutesToSupabase(routes, date) {
  log('💾 מסנכרן קווים ל-Supabase...');
  
  const routesData = routes.map(route => ({
    id: route.id,
    line_ref: route.line_ref,
    operator_ref: route.operator_ref,
    route_short_name: route.route_short_name,
    route_long_name: route.route_long_name,
    route_direction: route.route_direction,
    agency_name: route.agency_name,
    route_type: route.route_type,
    date: date,
    synced_at: new Date().toISOString()
  }));
  
  let inserted = 0;
  for (let i = 0; i < routesData.length; i += CONFIG.BATCH_SIZE) {
    const batch = routesData.slice(i, i + CONFIG.BATCH_SIZE);
    
    const { error } = await supabase
      .from('routes')
      .upsert(batch, { onConflict: 'id,date' });
    
    if (error) {
      logError(`שגיאה בהכנסת קווים batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}`, error);
      throw error;
    }
    
    inserted += batch.length;
    log(`   הוכנסו ${inserted.toLocaleString()} / ${routesData.length.toLocaleString()} קווים`);
    
    await sleep(50);
  }
  
  log(`✅ הושלם סנכרון ${routesData.length.toLocaleString()} קווים`);
}

async function syncRidesToSupabase(rides) {
  log('💾 מסנכרן נסיעות ל-Supabase...');
  
  const ridesData = rides.map(ride => ({
    id: ride.id,
    route_id: ride.gtfs_route_id,
    journey_ref: ride.journey_ref,
    start_time: ride.start_time,
    end_time: ride.end_time,
    synced_at: new Date().toISOString()
  }));
  
  let inserted = 0;
  for (let i = 0; i < ridesData.length; i += CONFIG.BATCH_SIZE) {
    const batch = ridesData.slice(i, i + CONFIG.BATCH_SIZE);
    
    const { error } = await supabase
      .from('rides')
      .upsert(batch, { onConflict: 'id' });
    
    if (error) {
      logError(`שגיאה בהכנסת נסיעות batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}`, error);
      throw error;
    }
    
    inserted += batch.length;
    log(`   הוכנסו ${inserted.toLocaleString()} / ${ridesData.length.toLocaleString()} נסיעות`);
    
    await sleep(50);
  }
  
  log(`✅ הושלם סנכרון ${ridesData.length.toLocaleString()} נסיעות`);
}

// ===============================
// בניית city_relevant_stops
// ===============================

function normalizeText(text) {
  if (!text) return '';
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[־\-]/g, ' ')
    .replace(/["'`״׳]/g, '')
    .toLowerCase();
}

function getCityNameVariants(cityName) {
  if (!cityName) return [];
  
  const variants = new Set([cityName]);
  
  if (cityName.includes('-')) {
    const parts = cityName.split('-').map(p => p.trim());
    parts.forEach(part => {
      if (part.length >= 3) variants.add(part);
    });
  }
  
  const prefixes = ['כפר', 'קרית', 'גבעת', 'רמת', 'נווה'];
  prefixes.forEach(prefix => {
    if (cityName.startsWith(prefix + ' ')) {
      const withoutPrefix = cityName.substring(prefix.length + 1);
      if (withoutPrefix.length >= 3) variants.add(withoutPrefix);
    }
  });
  
  return Array.from(variants);
}

function isStopRelevantToCity(stop, cityName) {
  if (stop.city === cityName) {
    return { relevant: true, type: 'in_city', confidence: 1.0 };
  }
  
  const cityVariants = getCityNameVariants(cityName);
  const normalizedStopName = normalizeText(stop.name);
  
  for (const variant of cityVariants) {
    const normalizedVariant = normalizeText(variant);
    if (normalizedVariant.length >= 2 && normalizedStopName.includes(normalizedVariant)) {
      return {
        relevant: true,
        type: 'name_match',
        confidence: 0.8,
        matched_variant: variant
      };
    }
  }
  
  return { relevant: false };
}

async function buildCityRelevantStops(stops, date) {
  log('🔨 בונה טבלת city_relevant_stops...');
  
  const cities = [...new Set(stops.map(s => s.city).filter(Boolean))];
  log(`   מצאתי ${cities.length} ערים ייחודיות`);
  
  const relations = [];
  let processedCities = 0;
  
  for (const city of cities) {
    processedCities++;
    
    if (processedCities % 50 === 0) {
      log(`   עיבדתי ${processedCities} / ${cities.length} ערים...`);
    }
    
    for (const stop of stops) {
      const relevance = isStopRelevantToCity(stop, city);
      
      if (relevance.relevant) {
        relations.push({
          city: city,
          stop_id: stop.id,
          relevance_type: relevance.type,
          confidence: relevance.confidence,
          matched_text: relevance.matched_variant || null,
          date: date
        });
      }
    }
  }
  
  log(`✅ נוצרו ${relations.length.toLocaleString()} קשרים`);
  
  // מחק קשרים ישנים
  const { error: deleteError } = await supabase
    .from('city_relevant_stops')
    .delete()
    .eq('date', date);
  
  if (deleteError) {
    log(`⚠️  שגיאה במחיקת קשרים ישנים: ${deleteError.message}`);
  }
  
  // שמור קשרים חדשים
  log('💾 שומר קשרים ב-Supabase...');
  let inserted = 0;
  
  for (let i = 0; i < relations.length; i += CONFIG.BATCH_SIZE) {
    const batch = relations.slice(i, i + CONFIG.BATCH_SIZE);
    
    const { error } = await supabase
      .from('city_relevant_stops')
      .insert(batch);
    
    if (error) {
      logError(`שגיאה בהכנסת קשרים batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}`, error);
      throw error;
    }
    
    inserted += batch.length;
    log(`   הוכנסו ${inserted.toLocaleString()} / ${relations.length.toLocaleString()} קשרים`);
    
    await sleep(50);
  }
  
  log(`✅ הושלם סנכרון city_relevant_stops`);
}

// ===============================
// ניקוי נתונים ישנים
// ===============================

async function cleanupOldData() {
  log('🧹 מנקה נתונים ישנים...');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.KEEP_DAYS);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  
  const tables = ['stops', 'routes', 'city_relevant_stops'];
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .lt('date', cutoffDateStr);
    
    if (error) {
      logError(`שגיאה במחיקת ${table}`, error);
    } else {
      log(`   נמחקו רשומות מ-${table} מלפני ${cutoffDateStr}`);
    }
  }
  
  log('✅ ניקוי הושלם');
}

// ===============================
// סטטיסטיקות
// ===============================

async function showStats() {
  log('\n📊 סטטיסטיקות:');
  
  const { count: stopsCount } = await supabase
    .from('stops')
    .select('*', { count: 'exact', head: true });
  
  const { count: routesCount } = await supabase
    .from('routes')
    .select('*', { count: 'exact', head: true });
  
  const { count: ridesCount } = await supabase
    .from('rides')
    .select('*', { count: 'exact', head: true });
  
  const { count: relationsCount } = await supabase
    .from('city_relevant_stops')
    .select('*', { count: 'exact', head: true });
  
  log(`   תחנות: ${stopsCount?.toLocaleString() || 'N/A'}`);
  log(`   קווים: ${routesCount?.toLocaleString() || 'N/A'}`);
  log(`   נסיעות: ${ridesCount?.toLocaleString() || 'N/A'}`);
  log(`   קשרי עיר-תחנה: ${relationsCount?.toLocaleString() || 'N/A'}`);
}

// ===============================
// Main
// ===============================

async function main() {
  const startTime = Date.now();
  
  log('╔══════════════════════════════════════════════════════════╗');
  log('║  Open Bus → Supabase - GitHub Actions Sync              ║');
  log('╚══════════════════════════════════════════════════════════╝\n');
  
  const date = getCurrentDate();
  log(`📅 תאריך: ${date}\n`);
  
  try {
    // שלב 1: תחנות
    const stops = await loadAllStopsFromAPI(date);
    await syncStopsToSupabase(stops, date);
    
    // שלב 2: קווים
    const routes = await loadAllRoutesFromAPI(date);
    await syncRoutesToSupabase(routes, date);
    
    // שלב 3: נסיעות (דגימה)
    const rides = await loadRidesSampleFromAPI(date, CONFIG.MAX_RIDES_SAMPLE);
    await syncRidesToSupabase(rides);
    
    // שלב 4: בניית city_relevant_stops
    await buildCityRelevantStops(stops, date);
    
    // שלב 5: ניקוי
    await cleanupOldData();
    
    // שלב 6: סטטיסטיקות
    await showStats();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n✅ סנכרון יומי הושלם! (${duration} שניות)`);
    
    process.exit(0);
    
  } catch (error) {
    logError('שגיאה קריטית', error);
    console.error(error);
    process.exit(1);
  }
}

// הרצה
main();
