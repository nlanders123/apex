-- Add micronutrient daily targets to profiles
-- RDA values as defaults (adult male baseline)
alter table profiles
  add column target_fiber int default 30,
  add column target_sugar int default 50,
  add column target_sodium int default 2300,
  add column target_saturated_fat int default 22,
  add column target_cholesterol int default 300,
  add column target_potassium int default 3400,
  add column target_vitamin_a int default 900,
  add column target_vitamin_c int default 90,
  add column target_calcium int default 1000,
  add column target_iron int default 8;
