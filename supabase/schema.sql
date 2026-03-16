-- =============================================
-- 사주 레시피 데이터 Supabase 스키마
-- =============================================

-- 1. 오행별 식재료 기본 정보 (foodDB + ingredients 통합)
CREATE TABLE ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  element TEXT NOT NULL CHECK (element IN ('목', '화', '토', '금', '수')),
  name TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  benefit TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  organ TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 식재료별 메뉴 변형 (realMenus)
CREATE TABLE menus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_name TEXT NOT NULL REFERENCES ingredients(name) ON DELETE CASCADE,
  menu_items TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 레시피 상세 (recipes)
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_name TEXT NOT NULL REFERENCES ingredients(name) ON DELETE CASCADE,
  title TEXT NOT NULL,
  time TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT '쉬움',
  kcal TEXT NOT NULL DEFAULT '',
  recipe_ingredients TEXT[] NOT NULL DEFAULT '{}',
  steps TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 오행별 추천 음식 (getTodayFoods용 - 간단 버전)
CREATE TABLE recommended_foods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  element TEXT NOT NULL CHECK (element IN ('목', '화', '토', '금', '수')),
  emoji TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_ingredients_element ON ingredients(element);
CREATE INDEX idx_menus_ingredient ON menus(ingredient_name);
CREATE INDEX idx_recipes_ingredient ON recipes(ingredient_name);
CREATE INDEX idx_recommended_foods_element ON recommended_foods(element);

-- RLS (Row Level Security) - 읽기 전용 공개
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommended_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredients_read" ON ingredients FOR SELECT USING (true);
CREATE POLICY "menus_read" ON menus FOR SELECT USING (true);
CREATE POLICY "recipes_read" ON recipes FOR SELECT USING (true);
CREATE POLICY "recommended_foods_read" ON recommended_foods FOR SELECT USING (true);
