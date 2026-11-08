export interface GameItem {
  emoji: string;
  nameId: string;
  nameEn: string;
  category: 'animals' | 'fruits' | 'veggies' | 'plants' | 'vehicles' | 'colors' | 'shapes';
  factId?: string;
  factEn?: string;
  shapeType?: string;
  shapeLabelId?: string;
  shapeLabelEn?: string;
}

const parseCatalog = (
  raw: string,
  category: GameItem['category']
): GameItem[] => {
  return raw
    .trim()
    .split('\n')
    .map((line) => {
      const parts = line.split('|');
      const emoji = parts[0]?.trim() || '';
      const nameId = parts[1]?.trim() || '';
      const nameEn = parts[2]?.trim() || nameId;
      return {
        emoji,
        nameId,
        nameEn,
        category,
      };
    });
};

// 1. ANIMALS (101 Items)
const RAW_ANIMALS = `🐱|Kucing|Cat
🐔|Ayam|Chicken
🐶|Anjing|Dog
🐮|Sapi|Cow
🐐|Kambing|Goat
🦆|Bebek|Duck
🐟|Ikan|Fish
🐦|Burung|Bird
🐰|Kelinci|Rabbit
🐃|Kerbau|Buffalo
🦎|Cicak|Gecko
🐜|Semut|Ant
🦟|Nyamuk|Mosquito
🦋|Kupu-kupu|Butterfly
🐝|Lebah|Bee
🐸|Katak|Frog
🐍|Ular|Snake
🐢|Kura-kura|Turtle
🐴|Kuda|Horse
🐑|Domba|Sheep
🐭|Tikus|Mouse
🕷️|Laba-laba|Spider
🦗|Jangkrik|Cricket
🐌|Siput|Snail
🐛|Ulat|Caterpillar
🪰|Lalat|Fly
🐞|Kepik|Ladybug
🐓|Ayam Jantan|Rooster
🐤|Anak Ayam|Chick
🐘|Gajah|Elephant
🐵|Monyet|Monkey
🐅|Harimau|Tiger
🦁|Singa|Lion
🦒|Jerapah|Giraffe
🦓|Zebra|Zebra
🐊|Buaya|Crocodile
🦧|Orangutan|Orangutan
🦏|Badak|Rhino
🦜|Burung Beo|Parrot
🦅|Elang|Eagle
🦉|Burung Hantu|Owl
🐻|Beruang|Bear
🐼|Panda|Panda
🐿️|Tupai|Squirrel
🦇|Kelelawar|Bat
🐠|Ikan Hias|Tropical Fish
🐙|Gurita|Octopus
🦀|Kepiting|Crab
🦐|Udang|Shrimp
🐬|Lumba-lumba|Dolphin
🐳|Paus|Whale
🦈|Hiu|Shark
🦢|Angsa|Swan
🕊️|Merpati|Dove
🦚|Burung Merak|Peacock
🦩|Flamingo|Flamingo
🐧|Pinguin|Penguin
🦃|Kalkun|Turkey
🦍|Gorila|Gorilla
🐪|Unta|Camel
🦘|Kanguru|Kangaroo
🐨|Koala|Koala
🦛|Kuda Nil|Hippo
🦌|Rusa|Deer
🐺|Serigala|Wolf
🦊|Rubah|Fox
🐹|Hamster|Hamster
🦔|Landak|Hedgehog
🐆|Macan Tutul|Leopard
🦙|Llama|Llama
🦂|Kalajengking|Scorpion
🦞|Lobster|Lobster
🦑|Cumi-cumi|Squid
🐡|Ikan Buntal|Pufferfish
🦖|Dinosaurus T-Rex|T-Rex
🦕|Dinosaurus Leher Panjang|Long-neck Dino
🐋|Paus Biru|Blue Whale
🦭|Anjing Laut|Seal
🦦|Berang-berang|Otter
🦥|Kungkang|Sloth
🦨|Sigung|Skunk
🦡|Luak|Badger
🦬|Bison|Bison
🐂|Banteng|Bull
🦣|Mamut|Mammoth
🐀|Tikus Besar|Rat
🐩|Pudel|Poodle
🦮|Anjing Pemandu|Guide Dog
🦤|Dodo|Dodo
🪲|Kumbang|Beetle
🪳|Kecoa|Cockroach
🪱|Cacing|Worm
🐚|Kerang|Shell
🦪|Tiram|Oyster
🐄|Sapi Perah|Dairy Cow
🐎|Kuda Pacu|Racehorse
🐏|Domba Jantan|Ram
🐫|Unta Dua Punuk|Bactrian Camel
🦝|Rakun|Raccoon
🐥|Anak Ayam Kecil|Baby Chick
🐣|Anak Ayam Menetas|Hatching Chick`;

// 2. FRUITS (101 Items)
const RAW_FRUITS = `🍌|Pisang|Banana
🍎|Apel|Apple
🍊|Jeruk|Orange
🥭|Mangga|Mango
🍉|Semangka|Watermelon
🍍|Nanas|Pineapple
🍈|Durian|Durian
🔴|Rambutan|Rambutan
🥭|Pepaya|Papaya
🌰|Salak|Snake Fruit
🥥|Kelapa|Coconut
🍐|Jambu Biji|Guava
🍇|Anggur|Grapes
🍈|Nangka|Jackfruit
🟣|Manggis|Mangosteen
🍈|Melon|Melon
🍓|Stroberi|Strawberry
⭐|Belimbing|Starfruit
🍎|Jambu Air|Water Apple
🥔|Sawo|Sapodilla
🍈|Duku|Duku Fruit
🥑|Alpukat|Avocado
🍐|Pir|Pear
🍋|Lemon|Lemon
🍐|Sirsak|Soursop
🍊|Markisa|Passion Fruit
🐉|Buah Naga|Dragon Fruit
🍑|Persik|Peach
🍈|Langsat|Langsat
🥝|Kedondong|Ambarella
🍈|Kelengkeng|Longan
🍒|Leci|Lychee
🍒|Ceri|Cherry
🥝|Srikaya|Sugar Apple
🍋|Jeruk Nipis|Lime
🍊|Jeruk Bali|Pomelo
🍏|Apel Hijau|Green Apple
🥝|Kiwi|Kiwi
🍈|Cempedak|Cempedak
🍑|Kesemek|Persimmon
🥔|Bengkuang|Jicama
🍊|Jeruk Keprok|Tangerine
🍊|Jeruk Siam|Siam Orange
🍌|Pisang Raja|King Banana
🍌|Pisang Ambon|Cavendish Banana
🍌|Pisang Kepok|Saba Banana
🍌|Pisang Mas|Lady Finger Banana
🍌|Pisang Tanduk|Horn Plantain
🍌|Pisang Susu|Milk Banana
🍌|Pisang Barangan|Barangan Banana
🍌|Pisang Lilin|Candle Banana
🫐|Blueberry|Blueberry
🫒|Zaitun|Olive
🥭|Mangga Arumanis|Arumanis Mango
🥭|Mangga Gedong Gincu|Gedong Mango
🥭|Mangga Harum Manis|Sweet Mango
🍉|Semangka Kuning|Yellow Watermelon
🍈|Melon Madu|Honeydew Melon
🍇|Anggur Hijau|Green Grapes
🍐|Pir Hijau|Green Pear
🥑|Alpukat Mentega|Butter Avocado
🥥|Kelapa Muda|Young Coconut
🥥|Kelapa Hijau|Green Coconut
🍊|Jeruk Mandarin|Mandarin Orange
🍐|Jambu Kristal|Crystal Guava
🥭|Kemang|Kemang Fruit
🍑|Kecapi|Santol
🍇|Menteng|Menteng Fruit
🫒|Matoa|Matoa
🌶️|Buah Merah|Red Fruit Papua
🍑|Bisbul|Velvet Apple
🍒|Lobi-lobi|Batoko Plum
🥭|Keledang|Keledang
🍈|Lai|Durian Puluk
🍒|Rukam|Governor Plum
🫘|Asam Jawa|Tamarind
🍈|Mengkudu|Noni
🥥|Kawista|Wood Apple
🥭|Gandaria|Kundang
🔴|Kapulasan|Pulasan
🥔|Kepel|Burahol
🍈|Sukun|Breadfruit
🍒|Kersen|Calabur
🫐|Murbei|Mulberry
🍒|Ciplukan|Golden Berry
🥭|Bacang|Horse Mango
🥭|Kuini|Saipan Mango
🍎|Delima|Pomegranate
🍑|Aprikot|Apricot
🫐|Plum|Plum
🫒|Kurma|Date Palm
🫐|Ara|Fig
🥜|Jambu Mete|Cashew Apple
🍇|Rambai|Rambai
🍈|Terap|Marang
🍇|Buni|Bignay
🍈|Kokosan|Kokosan
🫐|Gowok|Kupa Fruit
🍊|Mundu|False Mangosteen
🍇|Kepundung|River Duku
🍏|Cermai|Otaheite Gooseberry`;

// 3. VEGETABLES (100 Items)
const RAW_VEGGIES = `🥕|Wortel|Carrot
🍅|Tomat|Tomato
🌶️|Cabai|Chili
🥬|Bayam|Spinach
🌿|Kangkung|Water Spinach
🥬|Sawi|Greens
🥬|Kol|Cabbage
🥒|Mentimun|Cucumber
🌽|Jagung|Corn
🥔|Kentang|Potato
🧅|Bawang Merah|Shallot
🧄|Bawang Putih|Garlic
🍆|Terong|Eggplant
🫛|Buncis|Green Beans
🫛|Kacang Panjang|Yardlong Beans
🍐|Labu Siam|Chayote
🥔|Singkong|Cassava
🥦|Brokoli|Broccoli
🌱|Tauge|Bean Sprouts
🌱|Daun Bawang|Scallion
🌿|Seledri|Celery
🥒|Pare|Bitter Gourd
🥦|Kembang Kol|Cauliflower
🎃|Labu Kuning|Pumpkin
🍠|Ubi Jalar|Sweet Potato
🥜|Kacang Tanah|Peanut
🍄|Jamur|Mushroom
🫑|Paprika|Bell Pepper
🥕|Lobak|Radish
🌶️|Cabai Rawit|Bird Eye Chili
🥬|Selada|Lettuce
🥒|Oyong|Luffa
🌰|Jengkol|Dogfruit
🫛|Petai|Bitter Bean
🍃|Daun Singkong|Cassava Leaves
🫚|Jahe|Ginger
🫚|Kunyit|Turmeric
🫚|Lengkuas|Galangal
🌾|Serai|Lemongrass
🍠|Bit|Beetroot
🫘|Kacang Merah|Kidney Beans
🫘|Kacang Hijau|Mung Beans
🫘|Kedelai|Soybeans
🍃|Daun Katuk|Star Gooseberry
🍃|Daun Pepaya|Papaya Leaves
🥬|Genjer|Yellow Velvetleaf
🎋|Rebung|Bamboo Shoots
🍄|Jamur Tiram|Oyster Mushroom
🍄|Jamur Kuping|Wood Ear Mushroom
🌽|Jagung Manis|Sweet Corn
🌽|Jagung Muda|Baby Corn
🫛|Kecipir|Winged Bean
🫛|Kapri|Snow Pea
🫛|Okra|Okra
🥬|Kailan|Chinese Broccoli
🥬|Pakcoy|Bok Choy
🥬|Sawi Putih|Napa Cabbage
🥬|Sawi Hijau|Mustard Greens
🥬|Caisim|Choy Sum
🥬|Selada Air|Watercress
🥔|Talas|Taro
🍠|Ubi Ungu|Purple Sweet Potato
🍠|Ubi Cilembu|Honey Sweet Potato
🥔|Garut|Arrowroot
🥔|Gembili|Lesser Yam
🥔|Ganyong|Canna Starch
🥔|Kentang Hitam|Coleus Tuber
🌿|Kemangi|Lemon Basil
🍃|Daun Pandan|Pandan Leaves
🍃|Daun Salam|Indonesian Bay Leaf
🌺|Kecombrang|Torch Ginger
🌿|Kenikir|Cosmos Herb
🍃|Pucuk Labu|Pumpkin Shoots
🍃|Daun Melinjo|Gnetum Leaves
🌰|Melinjo|Gnetum Seeds
🍈|Kluwih|Seeded Breadfruit
🍈|Nangka Muda|Young Jackfruit
🍈|Pepaya Muda|Young Papaya
🌼|Bunga Pepaya|Papaya Flowers
🌸|Bunga Turi|Sesbania Flowers
🍈|Timun Suri|Blewah Cucumber
🎃|Waluh|Butternut Squash
🫐|Leunca|Black Nightshade
🫐|Rimbang|Turkey Berry
🍆|Terong Ungu|Purple Eggplant
🍅|Terong Belanda|Tamarillo
🫑|Paprika Merah|Red Bell Pepper
🫑|Paprika Kuning|Yellow Bell Pepper
🧅|Bawang Bombai|Yellow Onion
🍃|Daun Kelor|Moringa Leaves
🥬|Bayam Merah|Red Spinach
🫛|Kacang Polong|Green Peas
🫚|Jahe Merah|Red Ginger
🫚|Temulawak|Javanese Turmeric
🌶️|Cabai Merah|Red Chili
🫑|Cabai Hijau|Green Chili
🌱|Kucai|Chinese Chives
🍃|Daun Kari|Curry Leaves
🥬|Selada Merah|Red Lettuce
🌿|Daun Mint|Mint Leaves`;

// 4. PLANTS & FLOWERS (102 Items)
const RAW_PLANTS = `🌻|Bunga Matahari|Sunflower
🌹|Mawar|Rose
🌳|Pohon|Tree
🌸|Melati|Jasmine
🪻|Anggrek|Moon Orchid
🌴|Pohon Kelapa|Coconut Palm
🌾|Padi|Rice Plant
🌺|Kembang Sepatu|Hibiscus
🌱|Tunas|Sprout
🍃|Daun Hijau|Green Leaves
🌳|Pohon Mangga|Mango Tree
🌴|Pohon Pisang|Banana Tree
🎋|Bambu|Bamboo
🌼|Kamboja|Frangipani
🌿|Tanaman Herbal|Herb
🌼|Bunga Daisy|Daisy
🪴|Tanaman Hias|Potted Plant
🌳|Pohon Jambu|Guava Tree
🌳|Pohon Rambutan|Rambutan Tree
🪴|Lidah Buaya|Aloe Vera
🌺|Bougenville|Paperflower
🌼|Kenanga|Ylang-Ylang
🌼|Cempaka|Champak
🌼|Kemuning|Orange Jasmine
🌻|Alamanda|Golden Trumpet
🌺|Soka|Jungle Flame
🌺|Kana|Canna Lily
🪷|Teratai|Lotus
🌷|Tulip|Tulip
🌸|Bunga Sakura|Cherry Blossom
🌲|Pohon Cemara|Pine Tree
🌵|Kaktus|Cactus
🍀|Semanggi|Clover
🍂|Daun Gugur|Fallen Leaves
🍁|Daun Maple|Maple Leaf
💐|Buket Bunga|Bouquet
🥀|Bunga Layu|Wilted Flower
🌸|Dahlia|Dahlia
🌼|Krisan|Chrysanthemum
🌸|Aster|Aster Flower
🪷|Sedap Malam|Tuberose
🪷|Lili|Lily
🌸|Gladiol|Gladiolus
🌺|Rafflesia|Rafflesia Arnoldii
🪷|Bunga Bangkai|Titan Arum
🌼|Edelweis|Mountain Edelweiss
🪷|Teratai Biru|Blue Water Lily
🪷|Eceng Gondok|Water Hyacinth
🌳|Jati|Teak Tree
🌳|Mahoni|Mahogany
🌳|Beringin|Banyan Tree
🌳|Asam|Tamarind Tree
🌳|Trembesi|Rain Tree
🌺|Flamboyan|Royal Poinciana
🌳|Angsana|Rosewood
🌲|Pinus|Pine Forest
🌲|Cemara Udang|Ironwood Tree
🌴|Bakau|Mangrove Shrub
🌴|Mangrove|Mangrove Tree
🌴|Nipah|Nipa Palm
🌴|Sagu|Sago Palm
🌴|Aren|Sugar Palm
🌴|Kelapa Sawit|Oil Palm
🌳|Karet|Rubber Tree
☕|Kopi|Coffee Plant
🍵|Teh|Tea Bush
🍫|Kakao|Cocoa Tree
🌿|Cengkih|Clove Tree
🌰|Pala|Nutmeg Tree
🫐|Lada|Black Pepper Vine
🪵|Kayu Manis|Cinnamon Tree
🌿|Vanili|Vanilla Orchid
🎋|Tebu|Sugarcane
🍃|Tembakau|Tobacco Plant
☁️|Kapas|Cotton Plant
🌾|Sorgum|Sorghum
🍃|Pandan|Pandan Plant
🍃|Sirih|Betel Leaf Vine
🌾|Serai Wangi|Citronella Grass
🌿|Kumis Kucing|Cat Whiskers Herb
🌿|Sambiloto|Green Chiretta
🌿|Meniran|Chamber Bitter
🌸|Putri Malu|Sensitive Plant
🪴|Lidah Mertua|Snake Plant
🌿|Pakis|Fern
🌿|Suplir|Maidenhair Fern
🟩|Lumut|Moss
🌴|Paku Tiang|Tree Fern
🌴|Palem|Fan Palm
🎋|Rotan|Rattan Palm
🎋|Bambu Kuning|Yellow Bamboo
🎋|Bambu Petung|Giant Bamboo
🌾|Rumput Gajah|Elephant Grass
🌾|Alang-alang|Cogon Grass
🌾|Rumput Teki|Nut Grass
🪷|Kiambang|Water Lettuce
🌸|Anyelir|Carnation
🪴|Sri Rejeki|Aglaonema
🌺|Bunga Kertas|Zinnia
🫐|Kembang Telang|Butterfly Pea
🌼|Bunga Telekan|Lantana`;

// 5. VEHICLES (101 Items)
const RAW_VEHICLES = `🚗|Mobil|Car
🛵|Sepeda Motor|Motorbike
🚲|Sepeda|Bicycle
🚌|Bus|Bus
🚚|Truk|Truck
🚲|Becak|Cycle Rickshaw
🚂|Kereta Api|Train
✈️|Pesawat|Airplane
🚢|Kapal|Ship
🛺|Bajaj|Auto Rickshaw
🚐|Angkot|Minivan
🏍️|Ojek|Motorcycle Taxi
🐎|Delman|Horse Carriage
🚑|Ambulans|Ambulance
🚒|Mobil Pemadam|Fire Truck
🚓|Mobil Polisi|Police Car
🚜|Traktor|Tractor
⛵|Perahu Layar|Sailboat
🛶|Perahu|Canoe
🚁|Helikopter|Helicopter
🚂|Odong-odong|Kiddie Train
🐎|Andong|Royal Carriage
🚕|Taksi|Taxi
🚙|Mobil SUV|SUV
🚛|Truk Besar|Big Truck
🏍️|Motor Besar|Big Motorbike
🛴|Skuter|Scooter
🚤|Perahu Motor|Speedboat
🪵|Gerobak|Wooden Cart
🚲|Sepeda Ontel|Vintage Bicycle
🚎|Bus Listrik|Trolleybus
🚍|Bus Datang|Oncoming Bus
🚋|Trem|Tram
🚇|MRT|Metro Subway
🚄|Kereta Cepat|Fast Train
🚅|Kereta Peluru|Bullet Train
🚆|Kereta Penumpang|Passenger Train
🚈|LRT|Light Rail Transit
🚝|Monorel|Monorail
🚞|Kereta Gunung|Mountain Railway
🚃|Gerbong Kereta|Railway Car
🚊|Trem Kota|City Tram
🚡|Kereta Gantung|Cable Car
🚠|Kereta Gantung Gunung|Mountain Cableway
🚟|Kereta Layang|Suspension Railway
🛻|Mobil Pikap|Pickup Truck
🏎️|Mobil Balap|Race Car
🛹|Papan Seluncur|Skateboard
🛼|Sepatu Roda|Roller Skate
🚀|Roket|Rocket
🛸|Piring Terbang|Flying Saucer
🛩️|Pesawat Kecil|Small Airplane
🛫|Pesawat Lepas Landas|Takeoff
🛬|Pesawat Mendarat|Landing
🪂|Parasut|Parachute
🛥️|Kapal Motor|Motor Boat
⛴️|Kapal Feri|Ferry
🚔|Mobil Polisi Datang|Oncoming Police Car
🦽|Kursi Roda|Wheelchair
🦼|Kursi Roda Listrik|Motorized Wheelchair
🛷|Kereta Luncur|Sled
🐎|Dokar|Two-Wheeled Cart
🐎|Bendi|Minangkabau Cart
🛺|Bemo|Three-Wheeled Minibus
🚂|Kereta Kelinci|Carnival Train
🚲|Sepeda Listrik|Electric Bike
🛵|Motor Listrik|Electric Scooter
🚗|Mobil Listrik|Electric Car
⛵|Kapal Phinisi|Phinisi Schooner
🛶|Perahu Jukung|Jukung Outrigger
🛶|Perahu Bidar|Bidar Racing Boat
🪵|Getek|Bamboo River Raft
🪵|Rakit|Wood Raft
🚢|Tongkang|Barge
🛳️|Kapal Selam|Submarine
🚢|Kapal Perang|Battleship
🚢|Kapal Pesiar|Cruise Ship
🚢|Kapal Tanker|Tanker Ship
✈️|Pesawat Tempur|Fighter Jet
✈️|Pesawat Kargo|Cargo Aircraft
🎈|Balon Udara|Hot Air Balloon
🚆|KRL Commuter|Commuter Train
🚌|TransJakarta|BRT Bus
🚌|Bus Sekolah|School Bus
🚍|Bus Tingkat|Double Decker Bus
🚛|Truk Sampah|Garbage Truck
🚚|Truk Molen|Concrete Mixer
🚛|Truk Tangki|Tanker Truck
🚜|Buldoser|Bulldozer
🚜|Ekskavator|Excavator
🏗️|Derek|Tow Crane
🏗️|Crane|Mobile Crane
🐂|Pedati|Bullock Cart
🐂|Cikar|Oxen Wagon
🐎|Sado|Dos-a-dos Carriage
🚁|Helikopter SAR|Rescue Helicopter
🚆|Kereta Bandara|Airport Train
🚄|Whoosh|Whoosh Bullet Train
🛻|Mobil Derek|Tow Truck
🚛|Truk Kontainer|Container Truck
🚐|Mobil Boks|Box Delivery Van`;

// Parse complete 505 Items!
export const ANIMALS = parseCatalog(RAW_ANIMALS, 'animals');
export const FRUITS = parseCatalog(RAW_FRUITS, 'fruits');
export const VEGGIES = parseCatalog(RAW_VEGGIES, 'veggies');
export const PLANTS = parseCatalog(RAW_PLANTS, 'plants');
export const VEHICLES = parseCatalog(RAW_VEHICLES, 'vehicles');

// Fun educational facts lookup
const FACT_DESCRIPTIONS: Record<string, string> = {
  // Animals
  'Kucing': 'Kucing mengeong lembut dan suka tidur siang di tempat hangat.',
  'Anjing': 'Anjing hewan setia yang suka menyapa dengan kibasan ekor riang.',
  'Sapi': 'Sapi menghasilkan susu segar berprotein tinggi untuk pertumbuhan tulang.',
  'Ayam': 'Ayam betina bertelur setiap hari, ayam jantan berkokok membangunkan pagi.',
  'Bebek': 'Bebek pandai berenang dan bulunya dilapisi minyak alami tahan air.',
  'Kambing': 'Kambing suka melompat lincah dan makan rumput hijau segar.',
  'Gajah': 'Gajah adalah satwa darat terbesar yang punya belalai serbaguna.',
  'Harimau': 'Harimau Sumatra punya corak loreng indah untuk berkamuflase di rimba.',
  'Orangutan': 'Orangutan hewan cerdas yang hidup damai di kanopi hutan hujan.',
  'Komodo': 'Komodo adalah kadal terbesar di dunia yang hanya ada di Indonesia!',
  // Fruits
  'Durian': 'Durian dijuluki Raja Buah dengan duri tajam dan rasa legit manis harum.',
  'Rambutan': 'Rambutan manis berair dengan kulit merah berambut yang unik.',
  'Pepaya': 'Pepaya kaya vitamin A dan C yang sangat menyehatkan pencernaan.',
  'Manggis': 'Manggis dijuluki Ratu Buah karena rasanya manis asam segar mempesona.',
  'Salak': 'Salak berkulit cokelat bersisik seperti ular dengan daging buah renyah.',
  'Belimbing': 'Belimbing saat diiris berbentuk bintang kuning cerah berair segar.',
  // Plants
  'Melati': 'Melati Putih adalah Puspa Bangsa Indonesia berlambang kesucian budi.',
  'Anggrek': 'Anggrek Bulan adalah Puspa Pesona Indonesia yang anggun memikat.',
  'Kamboja': 'Bunga kamboja berpusat kuning wangi yang harum semerbak.',
  'Rafflesia': 'Rafflesia arnoldii adalah bunga tunggal terbesar di dunia asli Indonesia!',
  'Bunga Bangkai': 'Bunga bangkai mekar raksasa menjulang tinggi hingga 3 meter.',
  'Edelweis': 'Edelweis dijuluki bunga abadi yang tumbuh di lereng pegunungan tinggi.',
  // Vehicles
  'Becak': 'Becak kendaraan roda tiga ramah lingkungan yang dikayuh santai.',
  'Delman': 'Delman ditarik kuda lincah dengan gemerincing lonceng yang riang.',
  'Bajaj': 'Bajaj kendaraan roda tiga lincah yang mengantar warga keliling kota.',
  'Odong-odong': 'Odong-odong dihiasi lampu kelap-kelip dengan musik anak ceria.',
  'Whoosh': 'Kereta Cepat Whoosh Jakarta-Bandung melaju kilat hingga 350 km/jam!',
};

// Enrich items with facts
[ANIMALS, FRUITS, VEGGIES, PLANTS, VEHICLES].forEach((list) => {
  list.forEach((item) => {
    if (FACT_DESCRIPTIONS[item.nameId]) {
      item.factId = FACT_DESCRIPTIONS[item.nameId];
    } else {
      item.factId = `Pernahkah kamu melihat atau menemukan ${item.nameId}? Tanyakan pada Ayah atau Ibu dan carilah di sekitarmu!`;
    }
    item.factEn = `Have you ever seen ${item.nameEn}? Look around and explore together with family!`;
  });
});

// 6. COLORS (Warna)
export const COLORS: GameItem[] = [
  { emoji: '🔴', nameId: 'Merah', nameEn: 'Red', category: 'colors', factId: 'Merah adalah warna buah apel matang dan bunga mawar.' },
  { emoji: '🟠', nameId: 'Oranye', nameEn: 'Orange', category: 'colors', factId: 'Oranye adalah warna wortel segar dan buah jeruk manis.' },
  { emoji: '🟡', nameId: 'Kuning', nameEn: 'Yellow', category: 'colors', factId: 'Kuning adalah warna sinar matahari pagi dan buah pisang.' },
  { emoji: '🟢', nameId: 'Hijau', nameEn: 'Green', category: 'colors', factId: 'Hijau adalah warna daun pepohonan dan rumput taman.' },
  { emoji: '🔵', nameId: 'Biru', nameEn: 'Blue', category: 'colors', factId: 'Biru adalah warna langit cerah dan laut yang jernih.' },
  { emoji: '🟣', nameId: 'Ungu', nameEn: 'Purple', category: 'colors', factId: 'Ungu adalah warna buah anggur manis dan bunga terong.' },
  { emoji: '🟤', nameId: 'Cokelat', nameEn: 'Brown', category: 'colors', factId: 'Cokelat adalah warna batang pohon dan kue cokelat lezat.' },
  { emoji: '⚪', nameId: 'Putih', nameEn: 'White', category: 'colors', factId: 'Putih adalah warna bunga melati suci dan susu murni.' },
  { emoji: '⚫', nameId: 'Hitam', nameEn: 'Black', category: 'colors', factId: 'Hitam adalah warna langit malam bertabur bintang.' },
  { emoji: '💖', nameId: 'Merah Muda', nameEn: 'Pink', category: 'colors', factId: 'Merah muda adalah warna bunga sakura mekar di musim semi.' },
];

// 7. SHAPES & REAL-WORLD OBJECTS (Bentuk & Benda di Sekitar Kita - 54 Items)
export interface ShapeItem extends GameItem {
  shapeType: 'circle' | 'square' | 'rectangle' | 'triangle' | 'star' | 'heart' | 'diamond' | 'crescent' | 'oval' | 'hexagon' | 'cone' | 'cylinder';
  shapeLabelId: string;
  shapeLabelEn: string;
}

export const SHAPE_ITEMS: ShapeItem[] = [
  // --- LINGKARAN (CIRCLE) ---
  { emoji: '🍩', nameId: 'Donat (Lingkaran)', nameEn: 'Donut (Circle)', category: 'shapes', shapeType: 'circle', shapeLabelId: 'Lingkaran', shapeLabelEn: 'Circle', factId: 'Kue donat bundar dengan lubang di tengahnya berbentuk lingkaran sempurna!', factEn: 'Round donuts with a hole in the middle are perfect circles!' },
  { emoji: '🚲', nameId: 'Roda Sepeda (Lingkaran)', nameEn: 'Bicycle Wheel (Circle)', category: 'shapes', shapeType: 'circle', shapeLabelId: 'Lingkaran', shapeLabelEn: 'Circle', factId: 'Roda sepeda berbentuk lingkaran bundar agar dapat berputar menggelinding dengan lancar.', factEn: 'Bicycle wheels are round circles so they roll smoothly.' },
  { emoji: '🕒', nameId: 'Jam Dinding (Lingkaran)', nameEn: 'Wall Clock (Circle)', category: 'shapes', shapeType: 'circle', shapeLabelId: 'Lingkaran', shapeLabelEn: 'Circle', factId: 'Jam dinding lingkaran berputar menunjukkan waktu pagi, siang, dan malam.', factEn: 'Round wall clocks tick away to show day and night.' },
  { emoji: '🍕', nameId: 'Pizza Bulat (Lingkaran)', nameEn: 'Round Pizza (Circle)', category: 'shapes', shapeType: 'circle', shapeLabelId: 'Lingkaran', shapeLabelEn: 'Circle', factId: 'Satu loyang pizza utuh sebelum dipotong berbentuk lingkaran besar yang lezat.', factEn: 'A whole baked pizza is a delicious big circle.' },
  { emoji: '🪙', nameId: 'Koin Uang (Lingkaran)', nameEn: 'Coin (Circle)', category: 'shapes', shapeType: 'circle', shapeLabelId: 'Lingkaran', shapeLabelEn: 'Circle', factId: 'Uang logam koin berbentuk lingkaran pipih dengan angka nominal di permukaannya.', factEn: 'Metal coins are flat round circles.' },
  { emoji: '⚽', nameId: 'Bola Sepak (Lingkaran)', nameEn: 'Soccer Ball (Circle)', category: 'shapes', shapeType: 'circle', shapeLabelId: 'Lingkaran', shapeLabelEn: 'Circle', factId: 'Bola sepak tampak bundar melingkar dari segala arah saat ditendang ke gawang.', factEn: 'Soccer balls look circular from any angle.' },
  { emoji: '🔘', nameId: 'Kancing Baju (Lingkaran)', nameEn: 'Button (Circle)', category: 'shapes', shapeType: 'circle', shapeLabelId: 'Lingkaran', shapeLabelEn: 'Circle', factId: 'Kancing kemeja umumnya berbentuk lingkaran kecil untuk merapikan pakaian.', factEn: 'Shirt buttons are small functional circles.' },
  { emoji: '🍽️', nameId: 'Piring Makan (Lingkaran)', nameEn: 'Dinner Plate (Circle)', category: 'shapes', shapeType: 'circle', shapeLabelId: 'Lingkaran', shapeLabelEn: 'Circle', factId: 'Piring makan berbentuk lingkaran tempat menaruh nasi dan sayuran lezat.', factEn: 'Dinner plates are circular dishes for our meals.' },
  { emoji: '🌕', nameId: 'Bulan Purnama (Lingkaran)', nameEn: 'Full Moon (Circle)', category: 'shapes', shapeType: 'circle', shapeLabelId: 'Lingkaran', shapeLabelEn: 'Circle', factId: 'Bulan purnama bersinar bundar menerangi malam hari.', factEn: 'The full moon shines as a glowing circle in the night sky.' },
  { emoji: '⭕', nameId: 'Bentuk Lingkaran', nameEn: 'Circle Shape', category: 'shapes', shapeType: 'circle', shapeLabelId: 'Lingkaran', shapeLabelEn: 'Circle', factId: 'Lingkaran adalah bangun datar melengkung tanpa sudut lancip.', factEn: 'A circle is a smooth curved shape without corners.' },

  // --- PERSEGI / KOTAK (SQUARE) ---
  { emoji: '🛋️', nameId: 'Bantal Sofa (Persegi)', nameEn: 'Square Cushion (Square)', category: 'shapes', shapeType: 'square', shapeLabelId: 'Persegi', shapeLabelEn: 'Square', factId: 'Bantal sofa empuk memiliki 4 sisi yang sama panjang berbentuk persegi.', factEn: 'Cushions on the sofa have 4 equal sides.' },
  { emoji: '🎁', nameId: 'Kotak Kado (Persegi)', nameEn: 'Gift Box (Square)', category: 'shapes', shapeType: 'square', shapeLabelId: 'Persegi', shapeLabelEn: 'Square', factId: 'Kotak kado kejutan dihias pita cantik dengan sisi-sisi persegi sama panjang.', factEn: 'Surprise gift boxes have equal square faces.' },
  { emoji: '🔲', nameId: 'Ubin Lantai (Persegi)', nameEn: 'Floor Tile (Square)', category: 'shapes', shapeType: 'square', shapeLabelId: 'Persegi', shapeLabelEn: 'Square', factId: 'Ubin keramik lantai rumah tersusun rapi dari bentuk persegi.', factEn: 'Ceramic floor tiles are arranged in square patterns.' },
  { emoji: '🖼️', nameId: 'Bingkai Foto (Persegi)', nameEn: 'Photo Frame (Square)', category: 'shapes', shapeType: 'square', shapeLabelId: 'Persegi', shapeLabelEn: 'Square', factId: 'Bingkai foto persegi mengabadikan kenangan manis bersama keluarga.', factEn: 'Square photo frames hold cherished family memories.' },
  { emoji: '🎲', nameId: 'Dadu Permainan (Persegi)', nameEn: 'Game Dice (Square)', category: 'shapes', shapeType: 'square', shapeLabelId: 'Persegi', shapeLabelEn: 'Square', factId: 'Dadu permainan memiliki 6 sisi persegi dengan titik angka 1 hingga 6.', factEn: 'Playing dice have 6 square faces.' },
  { emoji: '🍞', nameId: 'Roti Tawar (Persegi)', nameEn: 'Toast Bread (Square)', category: 'shapes', shapeType: 'square', shapeLabelId: 'Persegi', shapeLabelEn: 'Square', factId: 'Irisan roti tawar sarapan pagi berbentuk persegi empuk dan harum.', factEn: 'Slices of sandwich bread are soft square shapes.' },
  { emoji: '♟️', nameId: 'Papan Catur (Persegi)', nameEn: 'Chessboard (Square)', category: 'shapes', shapeType: 'square', shapeLabelId: 'Persegi', shapeLabelEn: 'Square', factId: 'Papan catur terdiri dari 64 kotak persegi hitam dan putih yang berselang-seling.', factEn: 'Chessboards consist of 64 alternating square tiles.' },
  { emoji: '🪟', nameId: 'Jendela Rumah (Persegi)', nameEn: 'Window (Square)', category: 'shapes', shapeType: 'square', shapeLabelId: 'Persegi', shapeLabelEn: 'Square', factId: 'Jendela kamar berbentuk persegi mengalirkan udara segar dan sinar mentari.', factEn: 'Square windows let in fresh air and bright sunlight.' },
  { emoji: '🟦', nameId: 'Bentuk Persegi', nameEn: 'Square Shape', category: 'shapes', shapeType: 'square', shapeLabelId: 'Persegi', shapeLabelEn: 'Square', factId: 'Persegi memiliki 4 sisi sama panjang dan 4 sudut siku-siku yang rapi.', factEn: 'A square has 4 equal straight sides and 4 right angles.' },

  // --- PERSEGI PANJANG (RECTANGLE) ---
  { emoji: '📋', nameId: 'Papan Tulis (Persegi Panjang)', nameEn: 'Blackboard (Rectangle)', category: 'shapes', shapeType: 'rectangle', shapeLabelId: 'Persegi Panjang', shapeLabelEn: 'Rectangle', factId: 'Papan tulis di sekolah berbentuk persegi panjang tempat guru menulis pelajaran.', factEn: 'School blackboards are broad rectangular boards.' },
  { emoji: '🚪', nameId: 'Pintu Rumah (Persegi Panjang)', nameEn: 'House Door (Rectangle)', category: 'shapes', shapeType: 'rectangle', shapeLabelId: 'Persegi Panjang', shapeLabelEn: 'Rectangle', factId: 'Pintu rumah berdiri tegak dengan bentuk persegi panjang yang tinggi.', factEn: 'House doors are tall rectangles.' },
  { emoji: '📱', nameId: 'Layar Ponsel (Persegi Panjang)', nameEn: 'Phone Screen (Rectangle)', category: 'shapes', shapeType: 'rectangle', shapeLabelId: 'Persegi Panjang', shapeLabelEn: 'Rectangle', factId: 'Layar gawai dan tablet memiliki bentuk persegi panjang.', factEn: 'Mobile phones have rectangular display screens.' },
  { emoji: '📖', nameId: 'Buku Cerita (Persegi Panjang)', nameEn: 'Story Book (Rectangle)', category: 'shapes', shapeType: 'rectangle', shapeLabelId: 'Persegi Panjang', shapeLabelEn: 'Rectangle', factId: 'Buku dongeng dan buku gambar berbentuk persegi panjang.', factEn: 'Storybooks are rectangular bound pages.' },
  { emoji: '🪑', nameId: 'Meja Belajar (Persegi Panjang)', nameEn: 'Desk (Rectangle)', category: 'shapes', shapeType: 'rectangle', shapeLabelId: 'Persegi Panjang', shapeLabelEn: 'Rectangle', factId: 'Permukaan meja belajar persegi panjang luas untuk menaruh buku dan pensil.', factEn: 'Study desks offer broad rectangular tabletops.' },
  { emoji: '💵', nameId: 'Uang Kertas (Persegi Panjang)', nameEn: 'Banknote (Rectangle)', category: 'shapes', shapeType: 'rectangle', shapeLabelId: 'Persegi Panjang', shapeLabelEn: 'Rectangle', factId: 'Uang kertas rupiah dicetak dengan bentuk persegi panjang.', factEn: 'Paper currency notes are rectangular.' },
  { emoji: '🍫', nameId: 'Cokelat Batang (Persegi Panjang)', nameEn: 'Chocolate Bar (Rectangle)', category: 'shapes', shapeType: 'rectangle', shapeLabelId: 'Persegi Panjang', shapeLabelEn: 'Rectangle', factId: 'Batang cokelat lezat berbentuk persegi panjang yang bisa dipatahkan bersama.', factEn: 'Sweet chocolate bars are rectangular treats.' },
  { emoji: '🛏️', nameId: 'Kasur Tidur (Persegi Panjang)', nameEn: 'Bed Mattress (Rectangle)', category: 'shapes', shapeType: 'rectangle', shapeLabelId: 'Persegi Panjang', shapeLabelEn: 'Rectangle', factId: 'Kasur tidur empuk berbentuk persegi panjang tempat kita beristirahat.', factEn: 'Sleeping beds are rectangular mattresses.' },

  // --- SEGITIGA (TRIANGLE) ---
  { emoji: '⛺', nameId: 'Tenda Kemah (Segitiga)', nameEn: 'Camping Tent (Triangle)', category: 'shapes', shapeType: 'triangle', shapeLabelId: 'Segitiga', shapeLabelEn: 'Triangle', factId: 'Tenda berkemah di alam bebas memiliki pintu depan berbentuk segitiga.', factEn: 'Camping tents have triangular entryways.' },
  { emoji: '🍕', nameId: 'Potongan Pizza (Segitiga)', nameEn: 'Pizza Slice (Triangle)', category: 'shapes', shapeType: 'triangle', shapeLabelId: 'Segitiga', shapeLabelEn: 'Triangle', factId: 'Sepotong pizza lezat memiliki 3 sisi runcing menyerupai segitiga.', factEn: 'A slice of pizza has 3 sides and forms a triangle.' },
  { emoji: '⚠️', nameId: 'Rambu Segitiga (Segitiga)', nameEn: 'Traffic Sign (Triangle)', category: 'shapes', shapeType: 'triangle', shapeLabelId: 'Segitiga', shapeLabelEn: 'Triangle', factId: 'Rambu peringatan jalan berbentuk segitiga kuning agar mudah terlihat.', factEn: 'Caution road signs are bright yellow triangles.' },
  { emoji: '🏠', nameId: 'Atap Rumah (Segitiga)', nameEn: 'House Roof (Triangle)', category: 'shapes', shapeType: 'triangle', shapeLabelId: 'Segitiga', shapeLabelEn: 'Triangle', factId: 'Atap rumah berbentuk segitiga agar air hujan mengalir jatuh ke bawah.', factEn: 'Gabled house roofs form a sturdy triangle.' },
  { emoji: '👔', nameId: 'Gantungan Baju (Segitiga)', nameEn: 'Clothes Hanger (Triangle)', category: 'shapes', shapeType: 'triangle', shapeLabelId: 'Segitiga', shapeLabelEn: 'Triangle', factId: 'Gantungan baju berbentuk segitiga pas menopang pundak pakaian.', factEn: 'Clothes hangers are triangular frames for hanging shirts.' },
  { emoji: '🍉', nameId: 'Irisan Semangka (Segitiga)', nameEn: 'Watermelon Wedge (Triangle)', category: 'shapes', shapeType: 'triangle', shapeLabelId: 'Segitiga', shapeLabelEn: 'Triangle', factId: 'Potongan semangka merah manis berbentuk segitiga segar berair.', factEn: 'Watermelon slices resemble delicious red triangles.' },
  { emoji: '⛵', nameId: 'Layar Perahu (Segitiga)', nameEn: 'Boat Sail (Triangle)', category: 'shapes', shapeType: 'triangle', shapeLabelId: 'Segitiga', shapeLabelEn: 'Triangle', factId: 'Layar perahu berbentuk segitiga menangkap dorongan angin laut.', factEn: 'Sailboat sails are large triangular fabrics.' },
  { emoji: '🔺', nameId: 'Bentuk Segitiga', nameEn: 'Triangle Shape', category: 'shapes', shapeType: 'triangle', shapeLabelId: 'Segitiga', shapeLabelEn: 'Triangle', factId: 'Segitiga memiliki 3 sudut lancip dan 3 sisi yang sangat kokoh.', factEn: 'Triangles have 3 corners and 3 strong sides.' },

  // --- BINTANG (STAR) ---
  { emoji: '⭐', nameId: 'Bintang Laut (Bintang)', nameEn: 'Starfish (Star)', category: 'shapes', shapeType: 'star', shapeLabelId: 'Bintang', shapeLabelEn: 'Star', factId: 'Bintang laut memiliki 5 lengan indah yang merayap di terumbu karang.', factEn: 'Starfish have 5 arms and live along ocean reefs.' },
  { emoji: '⭐', nameId: 'Bintang Langit (Bintang)', nameEn: 'Night Star (Star)', category: 'shapes', shapeType: 'star', shapeLabelId: 'Bintang', shapeLabelEn: 'Star', factId: 'Bintang berkilau indah di langit malam bersama bulan.', factEn: 'Stars twinkle in the nighttime sky.' },
  { emoji: '⭐', nameId: 'Irisan Belimbing (Bintang)', nameEn: 'Starfruit Cut (Star)', category: 'shapes', shapeType: 'star', shapeLabelId: 'Bintang', shapeLabelEn: 'Star', factId: 'Buah belimbing saat dipotong melintang berbentuk bintang bersudut lima.', factEn: 'Sliced starfruits reveal a natural 5-pointed star.' },
  { emoji: '🌟', nameId: 'Bintang Juara (Bintang)', nameEn: 'Golden Star (Star)', category: 'shapes', shapeType: 'star', shapeLabelId: 'Bintang', shapeLabelEn: 'Star', factId: 'Bintang emas adalah tanda prestasi hebat untuk anak yang tekun belajar!', factEn: 'Golden stars celebrate your learning achievements!' },

  // --- HATI (HEART) ---
  { emoji: '🎈', nameId: 'Balon Hati (Hati)', nameEn: 'Heart Balloon (Heart)', category: 'shapes', shapeType: 'heart', shapeLabelId: 'Hati', shapeLabelEn: 'Heart', factId: 'Balon pesta berbentuk hati terbang melayang di udara.', factEn: 'Heart balloons bring festive love to celebrations.' },
  { emoji: '❤️', nameId: 'Bantal Hati (Hati)', nameEn: 'Heart Pillow (Heart)', category: 'shapes', shapeType: 'heart', shapeLabelId: 'Hati', shapeLabelEn: 'Heart', factId: 'Bantal berbentuk hati melambangkan cinta kasih sayang keluarga.', factEn: 'Heart pillows symbolize affection and family warmth.' },
  { emoji: '🍃', nameId: 'Daun Sirih (Hati)', nameEn: 'Betel Leaf (Heart)', category: 'shapes', shapeType: 'heart', shapeLabelId: 'Hati', shapeLabelEn: 'Heart', factId: 'Daun tanaman sirih herbal secara alami memiliki bentuk hati hijau.', factEn: 'Betel leaves are naturally heart-shaped green leaves.' },

  // --- BELAH KETUPAT (DIAMOND) ---
  { emoji: '🔶', nameId: 'Ketupat Lebaran (Belah Ketupat)', nameEn: 'Ketupat (Diamond)', category: 'shapes', shapeType: 'diamond', shapeLabelId: 'Belah Ketupat', shapeLabelEn: 'Diamond', factId: 'Ketupat dianyam dari janur kelapa berbentuk belah ketupat khas tradisi Indonesia.', factEn: 'Ketupats are woven from palm leaves in a diamond shape.' },
  { emoji: '🪁', nameId: 'Layang-layang (Belah Ketupat)', nameEn: 'Kite (Diamond)', category: 'shapes', shapeType: 'diamond', shapeLabelId: 'Belah Ketupat', shapeLabelEn: 'Diamond', factId: 'Layang-layang belah ketupat terbang tinggi menari di langit berangin.', factEn: 'Diamond-shaped kites soar gracefully in the wind.' },
  { emoji: '💎', nameId: 'Berlian (Belah Ketupat)', nameEn: 'Diamond Gem (Diamond)', category: 'shapes', shapeType: 'diamond', shapeLabelId: 'Belah Ketupat', shapeLabelEn: 'Diamond', factId: 'Batu permata berlian berkilau cemerlang memantulkan cahaya.', factEn: 'Diamond crystals sparkle with brilliant light.' },
  { emoji: '🔶', nameId: 'Bentuk Belah Ketupat', nameEn: 'Diamond Shape', category: 'shapes', shapeType: 'diamond', shapeLabelId: 'Belah Ketupat', shapeLabelEn: 'Diamond', factId: 'Belah ketupat memiliki 4 sisi sama panjang dengan dua pasang sudut berhadapan.', factEn: 'A rhombus has 4 equal sides in a tilted diamond stance.' },

  // --- BULAN SABIT (CRESCENT) ---
  { emoji: '🌙', nameId: 'Bulan Sabit (Bulan Sabit)', nameEn: 'Crescent Moon (Crescent)', category: 'shapes', shapeType: 'crescent', shapeLabelId: 'Bulan Sabit', shapeLabelEn: 'Crescent', factId: 'Bulan sabit melengkung tersenyum indah di awal bulan kalender.', factEn: 'The crescent moon curves like a smile in the evening.' },
  { emoji: '🥐', nameId: 'Roti Croissant (Bulan Sabit)', nameEn: 'Croissant (Crescent)', category: 'shapes', shapeType: 'crescent', shapeLabelId: 'Bulan Sabit', shapeLabelEn: 'Crescent', factId: 'Roti croissant renyah dipanggang melengkung seperti bulan sabit.', factEn: 'Croissants are baked into crescent curves.' },

  // --- LONJONG / OVAL (OVAL) ---
  { emoji: '🥚', nameId: 'Telur Ayam (Lonjong / Oval)', nameEn: 'Chicken Egg (Oval)', category: 'shapes', shapeType: 'oval', shapeLabelId: 'Lonjong', shapeLabelEn: 'Oval', factId: 'Telur ayam memiliki bentuk lonjong melengkung tanpa sudut.', factEn: 'Chicken eggs are smooth and oval.' },
  { emoji: '🏈', nameId: 'Bola Rugby (Lonjong / Oval)', nameEn: 'Rugby Ball (Oval)', category: 'shapes', shapeType: 'oval', shapeLabelId: 'Lonjong', shapeLabelEn: 'Oval', factId: 'Bola rugby lonjong mudah ditangkap dan dilempar melayang.', factEn: 'Rugby balls are prolate oval ellipsoids.' },

  // --- SEGI ENAM (HEXAGON) ---
  { emoji: '🍯', nameId: 'Sarang Lebah (Segi Enam)', nameEn: 'Honeycomb (Hexagon)', category: 'shapes', shapeType: 'hexagon', shapeLabelId: 'Segi Enam', shapeLabelEn: 'Hexagon', factId: 'Sarang lebah madu tersusun dari bentuk segi enam yang sangat kuat dan efisien!', factEn: 'Honeycombs are built of interlocking hexagons.' },
  { emoji: '🛑', nameId: 'Bentuk Segi Enam', nameEn: 'Hexagon Shape', category: 'shapes', shapeType: 'hexagon', shapeLabelId: 'Segi Enam', shapeLabelEn: 'Hexagon', factId: 'Bangun segi enam memiliki 6 sisi dan 6 sudut beraturan.', factEn: 'Hexagons have 6 equal sides and 6 vertices.' },

  // --- KERUCUT (CONE) ---
  { emoji: '🍚', nameId: 'Nasi Tumpeng (Kerucut)', nameEn: 'Tumpeng Rice (Cone)', category: 'shapes', shapeType: 'cone', shapeLabelId: 'Kerucut', shapeLabelEn: 'Cone', factId: 'Nasi tumpeng kuning meruncing ke atas melambangkan rasa syukur dan harapan baik.', factEn: 'Tumpeng yellow rice is molded into an auspicious cone.' },
  { emoji: '🍦', nameId: 'Corong Es Krim (Kerucut)', nameEn: 'Ice Cream Cone (Cone)', category: 'shapes', shapeType: 'cone', shapeLabelId: 'Kerucut', shapeLabelEn: 'Cone', factId: 'Corong wafel es krim berbentuk kerucut yang meruncing ke bawah.', factEn: 'Waffle ice cream cones taper down to a point.' },

  // --- TABUNG / SILINDER (CYLINDER) ---
  { emoji: '🥫', nameId: 'Kaleng Makanan (Tabung)', nameEn: 'Tin Can (Cylinder)', category: 'shapes', shapeType: 'cylinder', shapeLabelId: 'Tabung', shapeLabelEn: 'Cylinder', factId: 'Kaleng susu kental manis berbentuk tabung dengan alas lingkaran atas dan bawah.', factEn: 'Tin food cans are cylindrical containers.' },
  { emoji: '🥁', nameId: 'Drum Musik (Tabung)', nameEn: 'Drum (Cylinder)', category: 'shapes', shapeType: 'cylinder', shapeLabelId: 'Tabung', shapeLabelEn: 'Cylinder', factId: 'Alat musik drum berbentuk silinder berongga yang berbunyi merdu saat dipukul.', factEn: 'Drums are cylindrical percussion instruments.' },
];

export const SHAPES = SHAPE_ITEMS;

// ALL 559 library items combined (Animals 101 + Fruits 101 + Veggies 100 + Plants 102 + Vehicles 101 + Shapes 54)!
export const ALL_ITEMS = [...ANIMALS, ...FRUITS, ...VEGGIES, ...PLANTS, ...VEHICLES, ...SHAPE_ITEMS];

// Educational Game Modes
export interface GameDefinition {
  id: string;
  nameId: string;
  nameEn: string;
  emoji: string;
  color: string;
  ageRange: string;
  skillId: string;
  skillEn: string;
  howToId: string;
  howToEn: string;
  activityId: string;
  activityEn: string;
}

export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    id: 'animals',
    nameId: 'Tebak Hewan',
    nameEn: 'Animal Quiz',
    emoji: '🐶',
    color: '#ffd1e3',
    ageRange: '3–6 th',
    skillId: 'Mengenal hewan & kosakata',
    skillEn: 'Animal recognition & vocabulary',
    howToId: 'Lihat gambar hewan di layar, lalu ketuk nama yang benar. Di level Juara, kamu membaca nama lalu memilih gambarnya!',
    howToEn: 'Look at the animal and tap the correct answer. At Champion level, read the name and choose the picture!',
    activityId: 'Tirukan suara hewan bersama Ayah atau Ibu di rumah!',
    activityEn: 'Imitate animal sounds together at home!',
  },
  {
    id: 'animal_sound',
    nameId: 'Tebak Suara Hewan',
    nameEn: 'Animal Sound Quiz',
    emoji: '🔊',
    color: '#ffe48a',
    ageRange: '3–8 th',
    skillId: 'Pendengaran & fokus auditori',
    skillEn: 'Auditory focus & listening skills',
    howToId: 'Tekan tombol speaker untuk mendengarkan suara hewan, lalu tebak hewan mana yang bersuara!',
    howToEn: 'Press the speaker button to hear the animal sound, then choose which animal made it!',
    activityId: 'Tutup matamu dan tebak suara-suara benda di sekitarmu!',
    activityEn: 'Close your eyes and guess sounds around your home!',
  },
  {
    id: 'plants',
    nameId: 'Tebak Tumbuhan',
    nameEn: 'Plant Quiz',
    emoji: '🌻',
    color: '#c8f2dc',
    ageRange: '3–8 th',
    skillId: 'Mengenal alam & flora Indonesia',
    skillEn: 'Nature & Indonesian flora',
    howToId: 'Lihat bunga atau tumbuhan khas Indonesia (seperti Melati, Anggrek, Kamboja, Rafflesia), lalu ketuk namanya!',
    howToEn: 'Look at the plant or flower (like Jasmine, Orchid, Frangipani, Rafflesia), then tap its name!',
    activityId: 'Cari 3 jenis daun yang berbeda bentuknya di halaman rumah!',
    activityEn: 'Find 3 leaves of different shapes outside!',
  },
  {
    id: 'fruitveg',
    nameId: 'Buah & Sayur',
    nameEn: 'Fruits & Veggies',
    emoji: '🥕',
    color: '#ffd9c7',
    ageRange: '3–8 th',
    skillId: 'Klasifikasi & gizi sehat',
    skillEn: 'Classification & healthy foods',
    howToId: 'Lihat buah atau sayuran segar (Durian, Rambutan, Bayam, Kangkung, dll). Tebak namanya atau tentukan: buah atau sayur?',
    howToEn: 'Look at the fresh fruit or vegetable. Guess its name or decide: fruit or vegetable?',
    activityId: 'Sebutkan 3 buah dan sayur yang ada di dapurmu hari ini!',
    activityEn: 'Name 3 fruits and vegetables in your kitchen today!',
  },
  {
    id: 'vehicles',
    nameId: 'Tebak Kendaraan',
    nameEn: 'Vehicles Quiz',
    emoji: '🚗',
    color: '#cfe6ff',
    ageRange: '3–8 th',
    skillId: 'Transportasi & lingkungan',
    skillEn: 'Transportation & surroundings',
    howToId: 'Kenali berbagai kendaraan khas (Becak, Delman, Bajaj, Odong-odong, Kereta Whoosh, Kapal, Pesawat)!',
    howToEn: 'Recognize various vehicles (Becak, Bajaj, Train, Airplane, Ship)!',
    activityId: 'Hitung kendaraan roda dua dan roda empat yang lewat di depan rumah!',
    activityEn: 'Count the vehicles passing in front of your house!',
  },
  {
    id: 'colors',
    nameId: 'Warna Ceria',
    nameEn: 'Colors Quiz',
    emoji: '🎨',
    color: '#fff3b0',
    ageRange: '3–6 th',
    skillId: 'Persepsi visual & warna',
    skillEn: 'Visual perception & color sense',
    howToId: 'Lihat warna yang muncul dan pilih nama warnanya dengan tepat.',
    howToEn: 'Look at the color and tap its matching name.',
    activityId: 'Cari 3 benda berwarna merah dan 3 benda berwarna biru di kamarmu!',
    activityEn: 'Find 3 red and 3 blue items in your room!',
  },
  {
    id: 'shapes',
    nameId: 'Bentuk Lucu',
    nameEn: 'Shapes Quiz',
    emoji: '⭐',
    color: '#e2d6ff',
    ageRange: '3–6 th',
    skillId: 'Geometri dasar & pengenalan bentuk',
    skillEn: 'Basic geometry & shape sense',
    howToId: 'Kenali bentuk lingkaran, segitiga, persegi, bintang, dan bentuk seru lainnya.',
    howToEn: 'Identify circles, squares, triangles, stars, and fun shapes.',
    activityId: 'Buat bentuk segitiga dan lingkaran menggunakan jari atau tusuk gigi!',
    activityEn: 'Make triangles and circles using fingers or toothpicks!',
  },
  {
    id: 'count',
    nameId: 'Hitung Buah',
    nameEn: 'Count Fruit',
    emoji: '🍎',
    color: '#ffd1e3',
    ageRange: '4–7 th',
    skillId: 'Berhitung & konsep kuantitas',
    skillEn: 'Counting & number quantities',
    howToId: 'Gunakan jarimu untuk menghitung buah lezat di layar, lalu ketuk angka yang sesuai!',
    howToEn: 'Count the fruits on screen with your finger, then tap the right number!',
    activityId: 'Hitung jumlah sendok dan piring yang ada di meja makan!',
    activityEn: 'Count the spoons and plates on your dining table!',
  },
  {
    id: 'memory',
    nameId: 'Kartu Kembar',
    nameEn: 'Memory Match',
    emoji: '🃏',
    color: '#c8f2dc',
    ageRange: '4–9 th',
    skillId: 'Memori kerja & konsentrasi',
    skillEn: 'Working memory & focus',
    howToId: 'Buka dua kartu berturut-turut. Ingat posisinya dan temukan semua pasangan yang sama!',
    howToEn: 'Flip two cards. Remember their positions and find all matching pairs!',
    activityId: 'Tutup mata, lalu sebutkan 3 barang yang ada di atas meja!',
    activityEn: 'Close your eyes and recall 3 objects on the table!',
  },
  {
    id: 'bubbles',
    nameId: 'Pecah Gelembung',
    nameEn: 'Pop Bubbles',
    emoji: '🫧',
    color: '#cfe6ff',
    ageRange: '3–8 th',
    skillId: 'Koordinasi mata-tangan & ketangkasan',
    skillEn: 'Hand-eye coordination & reflexes',
    howToId: 'Ketuk gelembung-gelembung hewan yang terbang ke atas sebelum waktu habis!',
    howToEn: 'Pop the floating animal bubbles as fast as you can before time runs out!',
    activityId: 'Main gelembung sabun sungguhan di luar rumah bersama teman!',
    activityEn: 'Blow real soap bubbles outdoors!',
  },
  {
    id: 'order',
    nameId: 'Urutkan Angka',
    nameEn: 'Number Order',
    emoji: '🔢',
    color: '#fff3b0',
    ageRange: '5–9 th',
    skillId: 'Urutan bilangan & logika sekuensial',
    skillEn: 'Sequential logic & number ordering',
    howToId: 'Ketuk angka dari yang paling kecil (mulai dari 1) berurutan sampai angka terbesar!',
    howToEn: 'Tap numbers in ascending order from the smallest to the biggest!',
    activityId: 'Susun 5 buku dari yang paling tipis ke yang paling tebal!',
    activityEn: 'Arrange 5 books from thinnest to thickest!',
  },
  {
    id: 'compare',
    nameId: 'Mana Lebih Besar',
    nameEn: 'Compare Numbers',
    emoji: '⚖️',
    color: '#c8f2dc',
    ageRange: '6–10 th',
    skillId: 'Logika kuantitas & perbandingan',
    skillEn: 'Number sense & comparison',
    howToId: 'Dua angka muncul di timbangan. Pilih angka yang LEBIH BESAR atau LEBIH KECIL sesuai perintah!',
    howToEn: 'Two numbers appear. Pick the BIGGER or SMALLER one as instructed!',
    activityId: 'Bandingkan ukuran dua buah di kulkas: mana yang lebih berat?',
    activityEn: 'Compare two fruits in the kitchen: which is heavier?',
  },
  {
    id: 'pattern',
    nameId: 'Lanjutkan Pola',
    nameEn: 'Pattern Logic',
    emoji: '🧩',
    color: '#ffd1e3',
    ageRange: '5–9 th',
    skillId: 'Pola pikir logis & pemecahan masalah',
    skillEn: 'Pattern recognition & logical deduction',
    howToId: 'Perhatikan deretan gambar yang berulang. Pilih gambar yang tepat untuk melanjutkan tanda tanya (?)!',
    howToEn: 'Observe the repeating pattern and pick the item that completes the question mark (?)!',
    activityId: 'Buat pola berulang menggunakan sandal atau balok: besar-kecil-besar-kecil!',
    activityEn: 'Create a pattern with blocks or toys: big-small-big-small!',
  },
  {
    id: 'odd',
    nameId: 'Mana yang Berbeda',
    nameEn: 'Odd One Out',
    emoji: '🔍',
    color: '#e2d6ff',
    ageRange: '3–8 th',
    skillId: 'Pengelompokan & analisis visual',
    skillEn: 'Categorization & analytical thinking',
    howToId: 'Perhatikan sekelompok gambar. Satu di antaranya berbeda jenis (misal 3 hewan dan 1 mobil). Ketuk yang berbeda!',
    howToEn: 'Look at the pictures. One item is a different category. Tap the odd one out!',
    activityId: 'Kelompokkan mainanmu: pisahkan boneka dan mobil-mobilan ke dalam dua kotak!',
    activityEn: 'Sort your toys: separate stuffed animals from toy cars!',
  },
  {
    id: 'letters',
    nameId: 'Huruf Pertama',
    nameEn: 'First Letter',
    emoji: '🔤',
    color: '#cfe6ff',
    ageRange: '5–8 th',
    skillId: 'Fonik & pra-membaca',
    skillEn: 'Phonics & early literacy',
    howToId: 'Lihat gambar hewan atau benda, lalu tebak huruf pertama (atau huruf terakhir di level Juara) dari namanya!',
    howToEn: 'Look at the image and choose the first letter (or last letter at Champion level) of its name!',
    activityId: 'Sebutkan benda di kamarmu yang namanya dimulai dari huruf A, B, atau C!',
    activityEn: 'Find items in your room that start with letter A, B, or C!',
  },
  {
    id: 'math',
    nameId: 'Hitung Cepat',
    nameEn: 'Quick Math',
    emoji: '➕',
    color: '#e2d6ff',
    ageRange: '6–10 th',
    skillId: 'Penjumlahan & pengurangan',
    skillEn: 'Addition & subtraction arithmetic',
    howToId: 'Hitung hasil penjumlahan atau pengurangan dengan cepat. Boleh dibantu hitungan jari!',
    howToEn: 'Calculate the math equation. You can count on your fingers!',
    activityId: 'Bagi 10 butir biskuit dengan adik atau kakak, lalu hitung sisanya!',
    activityEn: 'Share 10 biscuits with family and count how many remain!',
  },
  {
    id: 'monster',
    nameId: 'Pahlawan vs Monster',
    nameEn: 'Hero vs Monster',
    emoji: '👾',
    color: '#ffd9c7',
    ageRange: '7–12 th',
    skillId: 'Petualangan matematika & strategi',
    skillEn: 'Math adventure & problem solving',
    howToId: 'Kalahkan monster jahat! Jawaban benar melancarkan serangan pahlawan. Hati-hati, jawaban salah membuat monster pulih!',
    howToEn: 'Defeat the monster! Correct answers attack; wrong answers heal it. Stay focused!',
    activityId: 'Ceritakan soal hitungan matematika terseru kepada Ayah atau Ibu!',
    activityEn: 'Share the most challenging math question with your parents!',
  },
];

// Age Level configurations
export interface AgeLevel {
  id: number;
  badge: string;
  nameId: string;
  nameEn: string;
  ageRange: string;
  stageId: string;
  stageEn: string;
  difficultyId: string;
  difficultyEn: string;
  descId: string;
  descEn: string;
}

export const AGE_LEVELS: AgeLevel[] = [
  {
    id: 0,
    badge: '🌱',
    nameId: 'Si Kecil',
    nameEn: 'Little One',
    ageRange: '3–4 th',
    stageId: 'PAUD',
    stageEn: 'Preschool',
    difficultyId: 'Mudah',
    difficultyEn: 'Easy',
    descId: 'Pilihan sedikit (2-3), tombol ekstra besar, putaran pendek, fokus pengenalan warna & suara.',
    descEn: 'Few choices (2-3), extra large buttons, short rounds, focus on colors and sounds.',
  },
  {
    id: 1,
    badge: '🌷',
    nameId: 'Pintar',
    nameEn: 'Smart',
    ageRange: '5–6 th',
    stageId: 'TK A/B',
    stageEn: 'Kindergarten',
    difficultyId: 'Sedang',
    difficultyEn: 'Medium',
    descId: 'Pilihan 3-4, angka sampai 10, pola gambar, klasifikasi buah vs sayur, kartu kembar 4 pasang.',
    descEn: '3-4 choices, numbers up to 10, patterns, fruit vs vegetable sorting, 4-pair memory.',
  },
  {
    id: 2,
    badge: '🌻',
    nameId: 'Juara',
    nameEn: 'Champion',
    ageRange: '7–8 th',
    stageId: 'SD Kelas 1–2',
    stageEn: 'Grade 1–2',
    difficultyId: 'Menantang',
    difficultyEn: 'Challenging',
    descId: 'Membaca nama lalu memilih gambar, huruf awal & akhir, angka hingga 100, tambah, kurang & kali.',
    descEn: 'Reading words to find pictures, phonics, numbers up to 100, arithmetic addition & multiplication.',
  },
];
