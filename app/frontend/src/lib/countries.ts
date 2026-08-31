export const COUNTRIES = [
  "Afghanistan", "Algeria", "Argentina", "Australia", "Austria", "Bahrain",
  "Bangladesh", "Belgium", "Brazil", "Canada", "China", "Denmark", "Egypt",
  "Finland", "France", "Germany", "Greece", "India", "Indonesia", "Iran",
  "Iraq", "Ireland", "Italy", "Japan", "Jordan", "Kenya", "Kuwait", "Lebanon",
  "Libya", "Malaysia", "Mexico", "Morocco", "Netherlands", "New Zealand",
  "Nigeria", "Norway", "Oman", "Pakistan", "Palestine", "Philippines",
  "Poland", "Portugal", "Qatar", "Saudi Arabia", "Singapore", "South Africa",
  "South Korea", "Spain", "Sudan", "Sweden", "Switzerland", "Syria",
  "Tunisia", "Turkey", "United Arab Emirates", "United Kingdom",
  "United States", "Yemen", "Other",
] as const;

export type CountryName = (typeof COUNTRIES)[number];

export const PROFESSIONAL_ROLES = [
  "Flavor Scientist",
  "Food Technologist",
  "Sensory Analyst",
  "Application Specialist",
  "Regulatory Specialist",
  "R&D Manager",
  "Quality Assurance",
  "Ingredient Specialist",
  "Student / Trainee",
  "Other",
] as const;

export const SPECIALTIES = [
  "Sweet",
  "Savory",
  "Beverage",
  "Dairy",
  "Bakery",
  "Fragrance",
  "Ingredients",
  "Sensory",
  "Regulatory",
  "Other",
] as const;

export const ENTERPRISE_SERVICE_OPTIONS = [
  { value: "brand_visibility", label: "Brand visibility" },
  { value: "recruitment", label: "Recruitment" },
  { value: "sponsored_content", label: "Sponsored content" },
  { value: "training", label: "Professional training" },
  { value: "market_intelligence", label: "Market intelligence" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
] as const;
