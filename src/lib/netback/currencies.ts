export type Currency = {
  code: string;
  symbol: string;
  name: string;
};

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "ARS", symbol: "$", name: "Argentine Peso" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  { code: "MAD", symbol: "MAD", name: "Moroccan Dirham" },
  { code: "TND", symbol: "TND", name: "Tunisian Dinar" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "XOF", symbol: "CFA", name: "West African CFA Franc" },
  { code: "XAF", symbol: "CFA", name: "Central African CFA Franc" },
  { code: "COP", symbol: "$", name: "Colombian Peso" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
  { code: "CLP", symbol: "$", name: "Chilean Peso" },
  { code: "MZN", symbol: "MT", name: "Mozambican Metical" },
  { code: "JOD", symbol: "JD", name: "Jordanian Dinar" },
  { code: "KWD", symbol: "KD", name: "Kuwaiti Dinar" },
  { code: "OMR", symbol: "OMR", name: "Omani Rial" },
  { code: "BHD", symbol: "BD", name: "Bahraini Dinar" },
  { code: "ILS", symbol: "₪", name: "Israeli Shekel" },
];

export function findCurrency(code: string): Currency {
  return CURRENCIES.find((currency) => currency.code === code) ?? CURRENCIES[0];
}
