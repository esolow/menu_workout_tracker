// Food database based on the nutritional guide image

export const PROTEIN_OPTIONS = [
  { id: 1, name: 'חזה עוף', nameEn: 'Chicken Breast', amount: '100 גרם', amountEn: '100g' },
  { id: 2, name: 'פסטרמה', nameEn: 'Pastrami', amount: '100 גרם', amountEn: '100g' },
  { id: 3, name: 'סינטה בקר רזה', nameEn: 'Lean Beef Sirloin', amount: '100 גרם', amountEn: '100g' },
  { id: 4, name: 'דג אמנון', nameEn: 'Tilapia Fish', amount: '100 גרם', amountEn: '100g' },
  { id: 5, name: 'דניס', nameEn: 'Sea Bream Fish', amount: '100 גרם', amountEn: '100g' },
  { id: 6, name: 'טופו', nameEn: 'Tofu', amount: '100 גרם', amountEn: '100g' },
  { id: 7, name: 'כבד עוף', nameEn: 'Chicken Liver', amount: '100 גרם', amountEn: '100g' },
  { id: 8, name: 'שייטל מספר 13', nameEn: 'Sirloin Tip #13', amount: '100 גרם', amountEn: '100g' },
  { id: 9, name: 'בשר טחון', nameEn: 'Ground Meat', amount: '80 גרם', amountEn: '80g' },
  { id: 10, name: 'סלמון', nameEn: 'Salmon', amount: '80 גרם', amountEn: '80g' },
  { id: 11, name: 'פרגית', nameEn: 'Chicken Thigh', amount: '80 גרם', amountEn: '80g' },
  { id: 12, name: 'אנטריקוט', nameEn: 'Entrecote/Ribeye', amount: '70 גרם', amountEn: '70g' },
  { id: 13, name: 'קופסת טונה במים', nameEn: 'Can of Tuna in Water', amount: '1 קופסה', amountEn: '1 can' },
  { id: 14, name: 'גבינה צהובה 9%', nameEn: 'Yellow Cheese 9%', amount: '3 פרוסות', amountEn: '3 slices' },
  { id: 15, name: 'קוטג\' 5%', nameEn: 'Cottage Cheese 5%', amount: '150 גרם', amountEn: '150g' },
  { id: 16, name: 'סקופ חלבון', nameEn: 'Protein Scoop', amount: '33 גרם', amountEn: '33g' },
  { id: 17, name: 'יוגורט פרו | משקה פרו', nameEn: 'Pro Yogurt | Pro Drink', amount: '1 יחידה', amountEn: '1 unit' },
  { id: 18, name: 'ביצים', nameEn: 'Eggs', amount: '2 ביצים + לבן', amountEn: '2 eggs + white' },
];

export const CARB_OPTIONS = [
  { id: 1, name: 'אפונה', nameEn: 'Peas', amount: '130 גרם', amountEn: '130g' },
  { id: 2, name: 'בורגול', nameEn: 'Bulgur', amount: '120 גרם', amountEn: '120g' },
  { id: 3, name: 'תפוח אדמה', nameEn: 'Potato', amount: '110 גרם', amountEn: '110g' },
  { id: 4, name: 'בטטה', nameEn: 'Sweet Potato', amount: '110 גרם', amountEn: '110g' },
  { id: 5, name: 'עדשים', nameEn: 'Lentils', amount: '100 גרם', amountEn: '100g' },
  { id: 6, name: 'קינואה', nameEn: 'Quinoa', amount: '90 גרם', amountEn: '90g' },
  { id: 7, name: 'אורז', nameEn: 'Rice', amount: '80 גרם', amountEn: '80g' },
  { id: 8, name: 'קוסקוס', nameEn: 'Couscous', amount: '80 גרם', amountEn: '80g' },
  { id: 9, name: 'שעועית לבנה', nameEn: 'White Beans', amount: '80 גרם', amountEn: '80g' },
  { id: 10, name: 'גרגירי חומוס', nameEn: 'Chickpeas', amount: '70 גרם', amountEn: '70g' },
  { id: 11, name: 'גריסים', nameEn: 'Groats/Barley', amount: '70 גרם', amountEn: '70g' },
  { id: 12, name: 'פסטה | פתיתים', nameEn: 'Pasta | Ptitim', amount: '60 גרם', amountEn: '60g' },
  { id: 13, name: 'שיבולת שועל', nameEn: 'Oats', amount: '30 גרם', amountEn: '30g' },
  { id: 14, name: 'גרנולה', nameEn: 'Granola', amount: '30 גרם', amountEn: '30g' },
  { id: 15, name: 'קורנפלקס', nameEn: 'Cornflakes', amount: '30 גרם', amountEn: '30g' },
  { id: 16, name: 'פריכיות פיטנס', nameEn: 'Fitness Crackers', amount: '7 פריכיות', amountEn: '7 crackers' },
  { id: 17, name: 'קרקרים פיטנס', nameEn: 'Fitness Crackers', amount: '5 קרקרים', amountEn: '5 crackers' },
  { id: 18, name: 'דפי אורז', nameEn: 'Rice Paper (Spring Roll)', amount: '3 דפים', amountEn: '3 sheets' },
  { id: 19, name: 'בננה', nameEn: 'Banana', amount: '1 בננה', amountEn: '1 banana' },
  { id: 20, name: 'לחם מלא | לבן', nameEn: 'Whole Wheat | White Bread', amount: 'פרוסה וחצי', amountEn: '1.5 slices' },
  { id: 21, name: 'פיתה 100 קלוריות', nameEn: '100 Calorie Pita', amount: '1 פיתה', amountEn: '1 pita' },
  { id: 22, name: 'פיתה | לחמנייה רגילה', nameEn: 'Pita | Regular Bun', amount: '1 יחידה (2 מנות)', amountEn: '1 unit (2 servings)' },
];

export const FAT_OPTIONS = [
  { id: 1, name: 'אבוקדו', nameEn: 'Avocado', amount: '70 גרם', amountEn: '70g' },
  { id: 2, name: 'חמאת בוטנים', nameEn: 'Peanut Butter', amount: '15 גרם', amountEn: '15g' },
  { id: 3, name: 'טחינה גולמית', nameEn: 'Raw Tahini', amount: '15 גרם', amountEn: '15g' },
  { id: 4, name: 'חמאת שקדים', nameEn: 'Almond Butter', amount: '15 גרם', amountEn: '15g' },
  { id: 5, name: 'אגוזי מלך', nameEn: 'Walnuts', amount: '15 גרם', amountEn: '15g' },
  { id: 6, name: 'שמן זית', nameEn: 'Olive Oil', amount: '10 גרם', amountEn: '10g' },
  { id: 7, name: 'שמן קוקוס', nameEn: 'Coconut Oil', amount: '10 גרם', amountEn: '10g' },
];

