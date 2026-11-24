import { Language } from './types';

export const LANGUAGES: { code: Language; label: string; native: string; dir?: 'rtl' | 'ltr' }[] = [
  { code: 'rw', label: 'Kinyarwanda', native: 'Kinyarwanda' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'sw', label: 'Swahili', native: 'Kiswahili' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'zh', label: 'Chinese', native: '中文' },
];

export interface CopyBundle {
  brand: string;
  navCollection: string;
  navRepair: string;
  navMap: string;
  navMessages: string;
  navSell: string;
  navAdmin: string;
  signIn: string;
  ordersBtn: string;
  heroKicker: string;
  heroTitle: string;
  heroLead: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  hubBuyTitle: string;
  hubBuyDesc: string;
  hubSellTitle: string;
  hubSellDesc: string;
  hubCommandTitle: string;
  hubCommandDesc: string;
  hubRepairTitle: string;
  hubRepairDesc: string;
  hubRentTitle: string;
  hubRentDesc: string;
  loginTableTitle: string;
  loginTableSubtitle: string;
  identifierLabel: string;
  passwordLabel: string;
  loginBtn: string;
  registerBtn: string;
  adminDetectedNote: string;
  catalogTitle: string;
  catalogSubtitle: string;
  searchPlaceholder: string;
  catAll: string;
  catSofas: string;
  catDining: string;
  catAccent: string;
  catOffice: string;
  catWardrobes: string;
  catBeds: string;
  catRentals: string;
  daysToMake: string;
  viewAndChat: string;
  sellerOwner: string;
  payOnlineTitle: string;
  payMomoCode: string;
  payPhone: string;
  payBank: string;
  payCod: string;
  orderModePurchase: string;
  orderModeCustom: string;
  orderModeRent: string;
  fabricLabel: string;
  dimensionsLabel: string;
  addressLabel: string;
  paymentRefLabel: string;
  notesLabel: string;
  confirmOrderBtn: string;
  chatTitle: string;
  chatSubtitle: string;
  chatPlaceholder: string;
  offerPlaceholder: string;
  sendBtn: string;
  signInToChat: string;
  repairTitle: string;
  repairSubtitle: string;
  repairStep1: string;
  repairUploadBtn: string;
  repairWorkshopLabel: string;
  repairTypeLabel: string;
  repairSubmitBtn: string;
  sellTitle: string;
  sellSubtitle: string;
  publishListingBtn: string;
  incomingOrdersTitle: string;
  messagesTitle: string;
  messagesEmpty: string;
  noProducts: string;
  mapTitle: string;
  mapSubtitle: string;
  mapYourLocation: string;
  mapOriginLocation: string;
  mapUseGps: string;
  mapDistanceLabel: string;
  adminTitle: string;
  adsTitle: string;
  adsSubtitle: string;
  adsPostBtn: string;
  wishlistTitle: string;
  wishlistSubtitle: string;
  wishlistEmpty: string;
  wishlistSave: string;
  wishlistSaved: string;
}

const rw: CopyBundle = {
  brand: 'JOKEVE FURNITURE',
  navCollection: 'Ibikoresho',
  navRepair: 'Gusana',
  navMap: 'Ikarita (Map)',
  navMessages: 'Uruganiriro',
  navSell: 'Curuza',
  navAdmin: 'Admin',
  signIn: 'Injira / Iyandikishe',
  ordersBtn: 'Command Zanjye',
  heroKicker: 'JOKEVE FURNITURE · Kigali Carpentry & Upholstery Atelier',
  heroTitle: 'Gura, Curuza, Kodesha cyangwa Usane Intebe n’Ibikoresho byo mu Giti.',
  heroLead:
    'Kugura intebe, garde-robe, utubati n’ibitanda, gukodesha intebe za plastiki n’iz’ibirori, gutanga command online, kureba aho uzanye igicuruzwa ageze ku ikarita, no kuganira n’umucuruzi.',
  heroPrimaryCta: 'Reba Ibikoresho Byose',
  heroSecondaryCta: 'Saba Gusana Intebe',
  hubBuyTitle: 'Kugura Ibikoresho',
  hubBuyDesc: 'Intebe, garde-robe, utubati & ibitanda.',
  hubSellTitle: 'Kugurisha',
  hubSellDesc: 'Shyiraho ibikoresho byawe ucuruze.',
  hubCommandTitle: 'Command Online',
  hubCommandDesc: 'Koresha ingano n’igitambaro ushaka.',
  hubRepairTitle: 'Gusana Intebe',
  hubRepairDesc: 'Hitamo ifoto cyangwa ushyiremo iyawe.',
  hubRentTitle: 'Gukodesha Intebe',
  hubRentDesc: 'Intebe za plastiki n’iz’ibirori ku munsi.',
  loginTableTitle: 'Kwinjira mu Kigo (Buyer · Seller · Admin)',
  loginTableSubtitle:
    'Injira ukoresheje nimero ya telephone cyangwa email na password. Email ya Administrator ihita itandukanywa ikagenzurwa mbere yo kwinjira.',
  identifierLabel: 'Nimero ya Telephone cyangwa Email',
  passwordLabel: 'Password (Ijambo ry’ibanga)',
  loginBtn: 'Injira',
  registerBtn: 'Fungura Konti Nshya',
  adminDetectedNote: 'Email ya Administrator yamenyekanye — Emeza email yawe mbere yo kwinjira.',
  catalogTitle: 'Ibikoresho byo mu Giti, Intebe & Gukodesha',
  catalogSubtitle:
    'Kanda ku gishushanyo cy’igikoresho ubone amakuru yacyo iruhande (50/50), uhitemo igihugu kugera ku mudugudu, wishyure, cyangwa uganire n’umucuruzi.',
  searchPlaceholder: 'Shakisha intebe, garde-robe, utubati, ibitanda...',
  catAll: 'Byose',
  catSofas: 'Salon & Sofa',
  catDining: 'Ameza & Kuriraho',
  catAccent: 'Intebe Zimwe',
  catOffice: 'Ibiro & Gusoma',
  catWardrobes: 'Garde-robe & Utubati',
  catBeds: 'Ibitanda',
  catRentals: 'Gukodesha (Plastiki)',
  daysToMake: 'iminsi yo gutegura',
  viewAndChat: 'Reba Details, Map & Chat',
  sellerOwner: 'Nyirigicuruzwa (Umucuruzi)',
  payOnlineTitle: 'Hitamo Uburyo bwo Kwishyura',
  payMomoCode: 'MoMo Code',
  payPhone: 'Nimero ya Telephone',
  payBank: 'Konti ya Banki',
  payCod: 'Bigeze Iwawe (COD)',
  orderModePurchase: 'Gura',
  orderModeCustom: 'Tanga Command',
  orderModeRent: 'Kodesha',
  fabricLabel: 'Igitambaro cyangwa Igiti',
  dimensionsLabel: 'Ingano (Dimensions)',
  addressLabel: 'Aho bigezwa (Location)',
  paymentRefLabel: 'Nimero y’uko wishyuye (Ref)',
  notesLabel: 'Ibindi bisobanuro',
  confirmOrderBtn: 'Emeza & Ohereza Command',
  chatTitle: 'Uruganiriro n’Umucuruzi (Online Chat)',
  chatSubtitle: 'Vugana mu magambo cyangwa wohereze ifoto; uwohereza n’uwoherezwa batandukanyijwe hamwe n’isaha.',
  chatPlaceholder: 'Andika ubutumwa bwawe hano...',
  offerPlaceholder: 'Igiciro (RWF)',
  sendBtn: 'Ohereza',
  signInToChat: 'Injira cyangwa wiyandikishe kugira ngo uganire n’umucuruzi kandi utange command.',
  repairTitle: 'Gusana Intebe (Upholstery & Frame Repair)',
  repairSubtitle:
    'Hitamo ifoto muri izi ziri ku rubuga ihwanye n’uko ushaka ko intebe zawe ziza kuba zimeze, cyangwa ushyiremo ifoto yawe bwite.',
  repairStep1: '1. Hitamo Ifoto y’Icyitegererezo cyangwa Shyiramo Iyawe',
  repairUploadBtn: 'Shyiramo Ifoto Yawe (Upload)',
  repairWorkshopLabel: 'Hitamo Umufundi / Atelier',
  repairTypeLabel: 'Icyo ukeneye ko basana',
  repairSubmitBtn: 'Ohereza Icyifuzo & Ganira n’Umufundi',
  sellTitle: 'Curuza & Sangiza Aho Ugeze (Seller Studio)',
  sellSubtitle:
    'Shyiraho intebe, garde-robe, utubati, ibitanda cyangwa intebe zo gukodesha, kandi usangize umukiriya aho ugeze utwaye igicuruzwa.',
  publishListingBtn: 'Shyira Igikoresho ku Rubuga',
  incomingOrdersTitle: 'Command & Sangiza Aho Ugeze (Live Location)',
  messagesTitle: 'Uruganiriro (Messages)',
  messagesEmpty: 'Nta biganiro uratangira. Kanda ku gikoresho cyangwa usabe gusana kugira ngo uganire n’umucuruzi.',
  noProducts: 'Nta gikoresho kibonetse muri iki cyiciro.',
  mapTitle: 'Ikarita y’Aho Uherereye, Umushoferi & Aho Igicuruzwa Kiva',
  mapSubtitle: 'Kurikirana intera kuva kuri atelier, aho utwaye igicuruzwa ageze, kugera iwawe.',
  mapYourLocation: 'Aho Uherereye (Destination)',
  mapOriginLocation: 'Aho Igicuruzwa Kiva (Origin)',
  mapUseGps: 'Koresha GPS Yanjye',
  mapDistanceLabel: 'Intera & Igihe cyo Kugera',
  adminTitle: 'Ubuyobozi Bukuru (Administrator Control)',
  adsTitle: 'Urubuga rwo Kwamamaza (Video & Amafoto ya Animation)',
  adsSubtitle:
    'Reba amashusho magufi cyangwa amafoto akora animation nka video, kandi ushyireho ibyamamaza byawe (video cyangwa amafoto menshi).',
  adsPostBtn: 'Shyiraho Ikimenyekanisha',
  wishlistTitle: 'Ibikunzwe (Wishlist)',
  wishlistSubtitle: 'Ibikoresho wabikijeho kugira ngo uzabigure, ubikodeshe cyangwa ubaze umucuruzi.',
  wishlistEmpty: 'Nta gikoresho urabika muri Wishlist. Kanda ku mutima kuri buri gikoresho kugira ngo ukibike.',
  wishlistSave: 'Bika muri Wishlist',
  wishlistSaved: 'Byabitswe muri Wishlist',
};

const en: CopyBundle = {
  brand: 'JOKEVE FURNITURE',
  navCollection: 'Catalog',
  navRepair: 'Repair',
  navMap: 'Route Map',
  navMessages: 'Messages',
  navSell: 'Sell',
  navAdmin: 'Admin',
  signIn: 'Sign In',
  ordersBtn: 'My Orders',
  heroKicker: 'JOKEVE FURNITURE · Kigali Carpentry & Upholstery Atelier',
  heroTitle: 'Buy, Sell, Rent, Commission, or Restore Fine Wooden & Event Furniture.',
  heroLead:
    'Shop chairs, wardrobes, cabinets, and hardwood beds, rent stackable plastic event chairs, select your exact Rwandan village location, track the courier live on the map, and chat with photo sharing.',
  heroPrimaryCta: 'Browse Catalog',
  heroSecondaryCta: 'Request Repair',
  hubBuyTitle: 'Buy Furniture',
  hubBuyDesc: 'Chairs, wardrobes, cabinets & beds.',
  hubSellTitle: 'Sell & List',
  hubSellDesc: 'Publish wooden & upholstered pieces.',
  hubCommandTitle: 'Custom Command',
  hubCommandDesc: 'Commission tailored sizes & finishes.',
  hubRepairTitle: 'Repair & Restore',
  hubRepairDesc: 'Pick a catalog style or upload yours.',
  hubRentTitle: 'Rent Chairs',
  hubRentDesc: 'Plastic & event chairs by the day.',
  loginTableTitle: 'Company Portal Sign In (Buyer · Seller · Admin)',
  loginTableSubtitle:
    'Sign in with phone number or email and password. Verified administrator emails are automatically distinguished and verified before opening Admin Control.',
  identifierLabel: 'Phone Number or Email',
  passwordLabel: 'Password',
  loginBtn: 'Sign In',
  registerBtn: 'Create Account',
  adminDetectedNote: 'Administrator email recognized — Verify email to unlock full control.',
  catalogTitle: 'Furniture, Cabinetry & Rental Collection',
  catalogSubtitle:
    'Click any design for a 50/50 image-and-details view, choose your location down to village level, pick payment, or chat with photos.',
  searchPlaceholder: 'Search chairs, wardrobes, cabinets, beds, plastic...',
  catAll: 'All Items',
  catSofas: 'Sofas & Lounges',
  catDining: 'Dining & Tables',
  catAccent: 'Accent Chairs',
  catOffice: 'Study & Office',
  catWardrobes: 'Wardrobes & Cabinets',
  catBeds: 'Beds',
  catRentals: 'Chair Rentals (Plastic)',
  daysToMake: 'days craft lead',
  viewAndChat: 'Details, Map & Chat',
  sellerOwner: 'Maker & Seller',
  payOnlineTitle: 'Choose Payment Method',
  payMomoCode: 'MoMo Code',
  payPhone: 'Phone Number',
  payBank: 'Bank Account',
  payCod: 'Pay on Delivery',
  orderModePurchase: 'Buy',
  orderModeCustom: 'Custom Order',
  orderModeRent: 'Rent Daily',
  fabricLabel: 'Material / Fabric',
  dimensionsLabel: 'Dimensions',
  addressLabel: 'Delivery Address',
  paymentRefLabel: 'Payment Reference',
  notesLabel: 'Notes',
  confirmOrderBtn: 'Confirm & Submit',
  chatTitle: 'Online Chat with Seller',
  chatSubtitle: 'Distinct sender/receiver bubbles with avatars, timestamps, and photo sharing.',
  chatPlaceholder: 'Write a message...',
  offerPlaceholder: 'Offer (RWF)',
  sendBtn: 'Send',
  signInToChat: 'Sign in or register to message the seller and submit orders.',
  repairTitle: 'Chair Repair & Reupholstery Studio',
  repairSubtitle:
    'Choose a reference finish from our catalog or upload a photo of your current chair to request restoration.',
  repairStep1: '1. Select a Reference Photo or Upload Your Chair Photo',
  repairUploadBtn: 'Upload Your Photo',
  repairWorkshopLabel: 'Choose Craft Workshop',
  repairTypeLabel: 'Restoration Service Needed',
  repairSubmitBtn: 'Submit Repair Request & Open Chat',
  sellTitle: 'Seller Workshop & Delivery Tracker',
  sellSubtitle:
    'Publish wooden furniture or rental chairs and share your live courier position with buyers.',
  publishListingBtn: 'Publish Listing',
  incomingOrdersTitle: 'Incoming Orders & Share Live Location',
  messagesTitle: 'Messages Inbox',
  messagesEmpty: 'No conversations yet. Open any furniture piece or submit a repair request to start chatting.',
  noProducts: 'No furniture items matched your search.',
  mapTitle: 'Live Origin, Courier & Delivery Route Map',
  mapSubtitle: 'Track workshop origin, live courier checkpoint, and your selected destination.',
  mapYourLocation: 'Your Location (Destination)',
  mapOriginLocation: 'Furniture Origin (Workshop)',
  mapUseGps: 'Use My GPS Location',
  mapDistanceLabel: 'Route Distance & ETA',
  adminTitle: 'Administrator Control Console',
  adsTitle: 'Featured Video & Animated Photo Advertising Stage',
  adsSubtitle:
    'Watch short furniture promos or publish your own commercial video clip or multi-photo animated reel.',
  adsPostBtn: 'Post Advertisement',
  wishlistTitle: 'Saved Wishlist',
  wishlistSubtitle: 'Furniture and rental items saved for quick ordering or seller inquiry.',
  wishlistEmpty: 'Your wishlist is empty. Click the heart icon on any item to save it here.',
  wishlistSave: 'Save to Wishlist',
  wishlistSaved: 'Saved in Wishlist',
};

const fr: CopyBundle = {
  ...en,
  navCollection: 'Catalogue',
  navRepair: 'Réparation',
  navMap: 'Carte & Suivi',
  navMessages: 'Messages',
  navSell: 'Vendre',
  signIn: 'Connexion',
  ordersBtn: 'Commandes',
  hubBuyTitle: 'Acheter',
  hubSellTitle: 'Vendre',
  hubCommandTitle: 'Sur Mesure',
  hubRepairTitle: 'Réparer',
  hubRentTitle: 'Louer Chaises',
  catWardrobes: 'Armoires & Placards',
  catBeds: 'Lits en Bois',
  catRentals: 'Location (Plastique)',
  orderModeRent: 'Louer',
  mapTitle: 'Carte d’Origine, Livreur & Destination',
};

const sw: CopyBundle = {
  ...en,
  navCollection: 'Samani',
  navRepair: 'Ukarabati',
  navMap: 'Ramani',
  navMessages: 'Ujumbe',
  navSell: 'Uza',
  signIn: 'Ingia',
  ordersBtn: 'Oda Zangu',
  hubBuyTitle: 'Nunua',
  hubSellTitle: 'Uza',
  hubCommandTitle: 'Agiza Maalum',
  hubRepairTitle: 'Karabati',
  hubRentTitle: 'Kodisha Viti',
  catWardrobes: 'Kabati & Makabati',
  catBeds: 'Vitanda',
  catRentals: 'Kukodisha (Plastiki)',
  orderModeRent: 'Kodisha',
};

const es: CopyBundle = {
  ...en,
  navCollection: 'Catálogo',
  navRepair: 'Reparación',
  navMap: 'Mapa en Vivo',
  navMessages: 'Mensajes',
  navSell: 'Vender',
  signIn: 'Iniciar Sesión',
  ordersBtn: 'Mis Pedidos',
  hubRentTitle: 'Alquilar Sillas',
  catWardrobes: 'Armarios y Muebles',
  catBeds: 'Camas de Madera',
  catRentals: 'Alquiler (Plástico)',
  orderModeRent: 'Alquilar',
};

const ar: CopyBundle = {
  ...en,
  navCollection: 'الأثاث',
  navRepair: 'الإصلاح',
  navMap: 'الخريطة',
  navMessages: 'الرسائل',
  navSell: 'بيع',
  navAdmin: 'الإدارة',
  signIn: 'تسجيل الدخول',
  ordersBtn: 'طلباتي',
  hubRentTitle: 'تأجير الكراسي',
  catWardrobes: 'خزائن الملابس',
  catBeds: 'أسرّة خشبية',
  catRentals: 'تأجير (بلاستيك)',
  orderModeRent: 'إيجار',
};

const de: CopyBundle = {
  ...en,
  navCollection: 'Katalog',
  navRepair: 'Reparatur',
  navMap: 'Lieferkarte',
  navMessages: 'Nachrichten',
  navSell: 'Verkaufen',
  signIn: 'Anmelden',
  ordersBtn: 'Bestellungen',
  hubRentTitle: 'Stühle Mieten',
  catWardrobes: 'Schränke',
  catBeds: 'Massivholzbetten',
  catRentals: 'Verleih (Plastik)',
  orderModeRent: 'Mieten',
};

const pt: CopyBundle = {
  ...en,
  navCollection: 'Catálogo',
  navRepair: 'Reparação',
  navMap: 'Mapa ao Vivo',
  navMessages: 'Mensagens',
  navSell: 'Vender',
  signIn: 'Entrar',
  ordersBtn: 'Pedidos',
  hubRentTitle: 'Alugar Cadeiras',
  catWardrobes: 'Guarda-roupas',
  catBeds: 'Camas de Madeira',
  catRentals: 'Aluguel (Plástico)',
  orderModeRent: 'Alugar',
};

const zh: CopyBundle = {
  ...en,
  navCollection: '家具目录',
  navRepair: '翻新维修',
  navMap: '实时地图',
  navMessages: '在线聊天',
  navSell: '我要出售',
  navAdmin: '管理后台',
  signIn: '登录 / 注册',
  ordersBtn: '我的订单',
  hubRentTitle: '座椅租赁',
  catWardrobes: '衣柜与储物柜',
  catBeds: '实木床具',
  catRentals: '塑料椅租赁',
  orderModeRent: '按日租赁',
};

const copyMap: Record<Language, CopyBundle> = {
  rw,
  en,
  fr,
  sw,
  es,
  ar,
  de,
  pt,
  zh,
};

export function getCopy(lang: Language): CopyBundle {
  return copyMap[lang] || en;
}
