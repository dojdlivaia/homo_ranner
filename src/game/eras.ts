export type ObKind =
  | "boulder"
  | "boulder2"
  | "fire"
  | "root"
  | "stone"
  | "log"
  | "amphora"
  | "column"
  | "barrel"
  | "gear"
  | "cone"
  | "crate";

export type FlyKind = "bird" | "spear" | "arrow" | "crow" | "drone";

export type PickupKind =
  | "torch"
  | "plow"
  | "sword"
  | "scroll"
  | "book"
  | "cog"
  | "phone";

export interface Palette {
  skyTop: string;
  skyBottom: string;
  sun: string;
  far: string;
  ground: string;
  line: string;
  ink: string;
  accent: string;
  accent2: string;
}

export interface Fact {
  year: string;
  title: string;
  text: string;
}

export interface EraDef {
  id: string;
  numeral: string;
  name: string;
  short: string;
  tagline: string;
  /** score threshold at which the era begins */
  at: number;
  palette: Palette;
  obstacles: ObKind[];
  flyer: FlyKind;
  pickup: PickupKind;
  fact: Fact;
}

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export const ERAS: EraDef[] = [
  {
    id: "paleo",
    numeral: "I",
    name: "Палеолит",
    short: "Камень",
    tagline: "Эра камня и первой искры",
    at: 0,
    palette: {
      skyTop: "#432c63",
      skyBottom: "#ff9d5c",
      sun: "#ffd84d",
      far: "#4a2b52",
      ground: "#4a3327",
      line: "#241a26",
      ink: "#241a26",
      accent: "#ff7a3d",
      accent2: "#ffd23f",
    },
    obstacles: ["boulder", "boulder2", "fire", "boulder", "fire"],
    flyer: "bird",
    pickup: "torch",
    fact: {
      year: "≈ 400 000 лет назад",
      title: "Огонь под контролем",
      text: "Горящая ветка стала первой технологией: тепло, свет, защита от хищников и приготовленная пища изменили сам ход эволюции человека.",
    },
  },
  {
    id: "neo",
    numeral: "II",
    name: "Неолит",
    short: "Плуг",
    tagline: "Эра плуга и первого зерна",
    at: 260,
    palette: {
      skyTop: "#4fb3a5",
      skyBottom: "#dff2b0",
      sun: "#fff4b8",
      far: "#3c7d5f",
      ground: "#5d4a30",
      line: "#28382a",
      ink: "#26332a",
      accent: "#e6b93d",
      accent2: "#8bc34a",
    },
    obstacles: ["root", "stone", "log", "root", "stone"],
    flyer: "bird",
    pickup: "plow",
    fact: {
      year: "≈ 10 000 лет до н. э.",
      title: "Неолитическая революция",
      text: "Плуг, зерно и домашний скот пришли на смену охоте и собирательству. Люди осели на земле — появились деревни, а затем и первые города.",
    },
  },
  {
    id: "bronze",
    numeral: "III",
    name: "Бронзовый век",
    short: "Бронза",
    tagline: "Эра металла, меча и первых городов",
    at: 520,
    palette: {
      skyTop: "#cf8f33",
      skyBottom: "#f6e3ac",
      sun: "#fff6d0",
      far: "#8a5a22",
      ground: "#6e4e28",
      line: "#3a2410",
      ink: "#3a2410",
      accent: "#ffcf4d",
      accent2: "#4db8a4",
    },
    obstacles: ["amphora", "stone", "log", "amphora", "boulder"],
    flyer: "spear",
    pickup: "sword",
    fact: {
      year: "≈ 3200 лет до н. э.",
      title: "Бронза и письменность",
      text: "Шумер изобрёл клинопись, а металлурги освоили бронзу. Троянская война (XII в. до н. э.) веками жила в песнях сказителей, прежде чем её записал Гомер.",
    },
  },
  {
    id: "rome",
    numeral: "IV",
    name: "Античность",
    short: "Легион",
    tagline: "Эра легионов и великих дорог",
    at: 800,
    palette: {
      skyTop: "#4a9fd4",
      skyBottom: "#d9ecf4",
      sun: "#fff3c4",
      far: "#5f7f96",
      ground: "#77684f",
      line: "#2b3340",
      ink: "#2b3340",
      accent: "#d64545",
      accent2: "#e9e2cf",
    },
    obstacles: ["column", "amphora", "column", "stone", "amphora"],
    flyer: "arrow",
    pickup: "scroll",
    fact: {
      year: "27 г. до н. э. — 476 г. н. э.",
      title: "Римский мир",
      text: "Легионы, мощёные дороги, акведуки и римское право связали Европу воедино. Латынь ещё тысячу лет оставалась языком науки и медицины.",
    },
  },
  {
    id: "medieval",
    numeral: "V",
    name: "Средневековье",
    short: "Замок",
    tagline: "Эра замков, рыцарей и манускриптов",
    at: 1080,
    palette: {
      skyTop: "#3a4a63",
      skyBottom: "#9fb0bc",
      sun: "#e9f0f4",
      far: "#2c3a52",
      ground: "#4a4436",
      line: "#181f2e",
      ink: "#181f2e",
      accent: "#c94040",
      accent2: "#e0b64b",
    },
    obstacles: ["barrel", "stone", "barrel", "log", "boulder"],
    flyer: "arrow",
    pickup: "book",
    fact: {
      year: "≈ 1440 год",
      title: "Печатный станок",
      text: "Гутенберг запустил печать подвижными литерами. Книга подешевела в десятки раз — и грамотность перестала быть привилегией монастырей.",
    },
  },
  {
    id: "industrial",
    numeral: "VI",
    name: "Индустриальная эра",
    short: "Пар",
    tagline: "Эра пара и заводских труб",
    at: 1360,
    palette: {
      skyTop: "#54483c",
      skyBottom: "#c2a06a",
      sun: "#e8c268",
      far: "#38302a",
      ground: "#403b34",
      line: "#1e1a16",
      ink: "#1e1a16",
      accent: "#f0a32f",
      accent2: "#9aa5ad",
    },
    obstacles: ["gear", "barrel", "gear", "crate", "barrel"],
    flyer: "crow",
    pickup: "cog",
    fact: {
      year: "1769 год",
      title: "Паровая машина",
      text: "Джеймс Уатт усовершенствовал паровой двигатель — началась промышленная революция: фабрики, железные дороги и миллионные города.",
    },
  },
  {
    id: "digital",
    numeral: "VII",
    name: "Цифровая эра",
    short: "Кремний",
    tagline: "Эра кремния: история продолжается",
    at: 1650,
    palette: {
      skyTop: "#16254d",
      skyBottom: "#3a5b9e",
      sun: "#dfe9ff",
      far: "#101c3a",
      ground: "#232936",
      line: "#0a0f1e",
      ink: "#0c1322",
      accent: "#41dcd8",
      accent2: "#ffc857",
    },
    obstacles: ["cone", "crate", "cone", "gear", "crate"],
    flyer: "drone",
    pickup: "phone",
    fact: {
      year: "1969 → 1991",
      title: "Цифровая эра",
      text: "Сначала ARPANET, затем Всемирная паутина. Теперь вся история человечества — от наскальной живописи до этого забега — помещается в кармане.",
    },
  },
];

export const TRIVIA: string[] = [
  "Рогатых шлемов у викингов не было — их придумали театральные костюмеры XIX века.",
  "Мамонты ещё бродили по Сибири, когда в Египте уже строили пирамиды.",
  "Клеопатра жила ближе по времени к высадке на Луну, чем к постройке Великой пирамиды.",
  "Римский бетон оказался прочнее современного: трещины в нём «залечивает» известь.",
  "Рыцарский доспех весил 20–25 кг — меньше, чем походная выкладка современного солдата.",
  "Оксфордский университет старше империи ацтеков почти на двести лет.",
  "Первый в истории сайт info.cern.ch работает до сих пор.",
  "Слово «робот» придумал писатель Карел Чапек в 1920 году — от чешского «robota» (каторжный труд).",
];

export function eraIndexAt(score: number): number {
  let idx = 0;
  for (let i = 0; i < ERAS.length; i++) {
    if (score >= ERAS[i].at) idx = i;
  }
  return idx;
}

export function eraProgress(score: number, idx: number): number {
  const cur = ERAS[idx].at;
  const next = idx + 1 < ERAS.length ? ERAS[idx + 1].at : cur + 300;
  return Math.min(1, Math.max(0, (score - cur) / (next - cur)));
}
