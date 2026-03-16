// =============================================
// Supabase 레시피 데이터 클라이언트
// =============================================
// 설정: 아래 SUPABASE_URL과 SUPABASE_ANON_KEY를
// 본인의 Supabase 프로젝트 값으로 교체하세요.
// =============================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL';       // 예: https://xyzcompany.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // 예: eyJhbGciOiJIUzI1NiIs...

let _supabase = null;
let _cache = {};

// Supabase 클라이언트 초기화
function initSupabase() {
  if (_supabase) return _supabase;
  if (typeof window !== 'undefined' && window.supabase &&
      SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] 연결 성공');
  }
  return _supabase;
}

// Supabase 사용 가능 여부
function isSupabaseReady() {
  return initSupabase() !== null;
}

// ===== 데이터 페치 함수들 =====

// 오행별 식재료 목록 가져오기 (ingredients 테이블)
async function fetchIngredients(element) {
  const cacheKey = `ingredients_${element || 'all'}`;
  if (_cache[cacheKey]) return _cache[cacheKey];

  const sb = initSupabase();
  if (!sb) return null;

  try {
    let query = sb.from('ingredients').select('*');
    if (element) query = query.eq('element', element);
    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    _cache[cacheKey] = data;
    return data;
  } catch (e) {
    console.warn('[Supabase] ingredients 조회 실패:', e.message);
    return null;
  }
}

// 식재료별 메뉴 변형 가져오기 (menus 테이블)
async function fetchMenus(ingredientName) {
  const cacheKey = `menus_${ingredientName || 'all'}`;
  if (_cache[cacheKey]) return _cache[cacheKey];

  const sb = initSupabase();
  if (!sb) return null;

  try {
    let query = sb.from('menus').select('*');
    if (ingredientName) query = query.eq('ingredient_name', ingredientName);

    const { data, error } = await query;
    if (error) throw error;

    _cache[cacheKey] = data;
    return data;
  } catch (e) {
    console.warn('[Supabase] menus 조회 실패:', e.message);
    return null;
  }
}

// 레시피 가져오기 (recipes 테이블)
async function fetchRecipe(ingredientName) {
  const cacheKey = `recipe_${ingredientName}`;
  if (_cache[cacheKey]) return _cache[cacheKey];

  const sb = initSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('recipes')
      .select('*')
      .eq('ingredient_name', ingredientName)
      .single();

    if (error) throw error;

    // DB 컬럼명을 기존 코드 형식으로 변환
    const recipe = {
      title: data.title,
      time: data.time,
      difficulty: data.difficulty,
      kcal: data.kcal,
      ingredients: data.recipe_ingredients,
      steps: data.steps
    };

    _cache[cacheKey] = recipe;
    return recipe;
  } catch (e) {
    console.warn('[Supabase] recipe 조회 실패:', e.message);
    return null;
  }
}

// 오행별 추천 음식 가져오기 (recommended_foods 테이블)
async function fetchRecommendedFoods(element) {
  const cacheKey = `recommended_foods_${element || 'all'}`;
  if (_cache[cacheKey]) return _cache[cacheKey];

  const sb = initSupabase();
  if (!sb) return null;

  try {
    let query = sb.from('recommended_foods').select('*');
    if (element) query = query.eq('element', element);

    const { data, error } = await query;
    if (error) throw error;

    _cache[cacheKey] = data;
    return data;
  } catch (e) {
    console.warn('[Supabase] recommended_foods 조회 실패:', e.message);
    return null;
  }
}

// ===== 통합 데이터 로더 =====

// 앱 시작 시 모든 데이터를 한 번에 로드 (캐시)
async function loadAllRecipeData() {
  if (!isSupabaseReady()) {
    console.log('[Supabase] 미설정 — 하드코딩 데이터 사용');
    return null;
  }

  try {
    const [ingredients, menus, recipes, foods] = await Promise.all([
      fetchIngredients(),
      fetchMenus(),
      fetchAllRecipes(),
      fetchRecommendedFoods()
    ]);

    if (!ingredients || !menus || !recipes || !foods) {
      console.warn('[Supabase] 일부 데이터 로드 실패 — 하드코딩 폴백');
      return null;
    }

    // 기존 코드 형식으로 변환
    const result = {
      // foodDB 형태: { '목': { name: [...], organ: '간' }, ... }
      foodDB: {},
      // ingredients 형태: { '목': [{ name, emoji, image, benefit, color }, ...], ... }
      ingredientsByElement: {},
      // realMenus 형태: { '시금치': ['메뉴1', '메뉴2', '메뉴3'], ... }
      realMenus: {},
      // recipes 형태: { '시금치': { title, time, difficulty, kcal, ingredients, steps }, ... }
      recipes: {},
      // recommendedFoods 형태: { '목': [{ emoji, name, reason }, ...], ... }
      recommendedFoods: {}
    };

    // ingredients → foodDB + ingredientsByElement
    for (const ing of ingredients) {
      if (!result.foodDB[ing.element]) {
        result.foodDB[ing.element] = { name: [], organ: ing.organ };
      }
      result.foodDB[ing.element].name.push(ing.name);

      if (!result.ingredientsByElement[ing.element]) {
        result.ingredientsByElement[ing.element] = [];
      }
      result.ingredientsByElement[ing.element].push({
        name: ing.name,
        emoji: ing.emoji,
        image: ing.image,
        benefit: ing.benefit,
        color: ing.color
      });
    }

    // menus → realMenus
    for (const m of menus) {
      result.realMenus[m.ingredient_name] = m.menu_items;
    }

    // recipes → recipes
    for (const r of recipes) {
      result.recipes[r.ingredient_name] = {
        title: r.title,
        time: r.time,
        difficulty: r.difficulty,
        kcal: r.kcal,
        ingredients: r.recipe_ingredients,
        steps: r.steps
      };
    }

    // recommendedFoods → recommendedFoods
    for (const f of foods) {
      if (!result.recommendedFoods[f.element]) {
        result.recommendedFoods[f.element] = [];
      }
      result.recommendedFoods[f.element].push({
        emoji: f.emoji,
        name: f.name,
        reason: f.reason
      });
    }

    console.log('[Supabase] 전체 데이터 로드 완료');
    window._supabaseRecipeData = result;
    return result;
  } catch (e) {
    console.warn('[Supabase] 전체 로드 실패:', e.message);
    return null;
  }
}

// 모든 레시피 가져오기
async function fetchAllRecipes() {
  const cacheKey = 'recipes_all';
  if (_cache[cacheKey]) return _cache[cacheKey];

  const sb = initSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('recipes')
      .select('*');
    if (error) throw error;

    _cache[cacheKey] = data;
    return data;
  } catch (e) {
    console.warn('[Supabase] recipes 전체 조회 실패:', e.message);
    return null;
  }
}

// 캐시 초기화 (새 데이터 추가 후 호출)
function clearRecipeCache() {
  _cache = {};
  window._supabaseRecipeData = null;
  console.log('[Supabase] 캐시 초기화');
}
