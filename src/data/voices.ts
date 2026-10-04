import { Voice, StylePreset, TempoOption, LanguageOption } from '../types';

export const VOICES: Voice[] = [
  // Perempuan
  { id: 'Kore', name: 'Kore', gender: 'female', character: 'Tegas' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'female', character: 'Cerah' },
  { id: 'Aoede', name: 'Aoede', gender: 'female', character: 'Ringan' },
  { id: 'Leda', name: 'Leda', gender: 'female', character: 'Muda' },
  { id: 'Sulafat', name: 'Sulafat', gender: 'female', character: 'Hangat' },
  { id: 'Achernar', name: 'Achernar', gender: 'female', character: 'Lembut' },
  { id: 'Gacrux', name: 'Gacrux', gender: 'female', character: 'Dewasa' },
  { id: 'Vindemiatrix', name: 'Vindemiatrix', gender: 'female', character: 'Halus' },
  // Laki-laki
  { id: 'Puck', name: 'Puck', gender: 'male', character: 'Ceria' },
  { id: 'Charon', name: 'Charon', gender: 'male', character: 'Informatif' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', character: 'Bersemangat' },
  { id: 'Orus', name: 'Orus', gender: 'male', character: 'Tegas' },
  { id: 'Algieba', name: 'Algieba', gender: 'male', character: 'Halus' },
  { id: 'Algenib', name: 'Algenib', gender: 'male', character: 'Serak / Berat' },
  { id: 'Iapetus', name: 'Iapetus', gender: 'male', character: 'Jernih' },
  { id: 'Schedar', name: 'Schedar', gender: 'male', character: 'Stabil' },
];

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'berita',
    label: 'Berita',
    instruction: 'formal, jelas, tempo mantap, intonasi netral-otoritatif seperti pembaca berita TV',
  },
  {
    id: 'narasi-dokumenter',
    label: 'Narasi Dokumenter',
    instruction: 'tenang, dalam, berwibawa, jeda dramatis di titik',
  },
  {
    id: 'storytelling',
    label: 'Storytelling',
    instruction: 'hangat, ekspresif, naik-turun intonasi mengikuti alur cerita',
  },
  {
    id: 'iklan',
    label: 'Iklan / Promosi',
    instruction: 'energik, antusias, persuasif',
  },
  {
    id: 'edukasi',
    label: 'Edukasi / Penjelasan',
    instruction: 'ramah, jelas, tempo sedang, penekanan di istilah penting',
  },
  {
    id: 'podcast',
    label: 'Podcast Santai',
    instruction: 'natural, conversational, seperti ngobrol',
  },
  {
    id: 'dramatis',
    label: 'Dramatis / Misteri',
    instruction: 'pelan, berat, tegang, jeda panjang',
  },
  {
    id: 'bisik',
    label: 'Bisik / ASMR',
    instruction: 'lembut, berbisik',
  },
  {
    id: 'custom',
    label: 'Custom (Bebas)',
    instruction: '',
  },
];

export const TEMPO_OPTIONS: TempoOption[] = [
  {
    id: 'lambat',
    label: 'Lambat',
    instruction: 'tempo lambat, tenang, dan santai',
  },
  {
    id: 'normal',
    label: 'Normal',
    instruction: 'tempo normal, stabil, dan wajar',
  },
  {
    id: 'cepat',
    label: 'Cepat',
    instruction: 'tempo cepat, dinamis, dan cekatan',
  },
];

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'id', label: 'Indonesia', promptName: 'bahasa Indonesia' },
  { id: 'en', label: 'English', promptName: 'bahasa Inggris (English)' },
  { id: 'jv', label: 'Jawa', promptName: 'bahasa Jawa' },
  { id: 'su', label: 'Sunda', promptName: 'bahasa Sunda' },
  { id: 'ja', label: 'Jepang', promptName: 'bahasa Jepang' },
  { id: 'zh', label: 'Mandarin', promptName: 'bahasa Mandarin' },
  { id: 'ar', label: 'Arab', promptName: 'bahasa Arab' },
  { id: 'es', label: 'Spanyol', promptName: 'bahasa Spanyol' },
];

export const SAMPLE_TEXTS = [
  {
    title: 'Berita Singkat',
    presetId: 'berita',
    tempoId: 'normal',
    voiceId: 'Kore',
    text: `Selamat malam pemirsa. Pemerintah hari ini resmi mengumumkan peluncuran program transformasi energi bersih terpadu. Langkah strategis ini diharapkan mampu mengakselerasi pengurangan emisi karbon nasional hingga TIGA PULUH persen pada tahun 2030 mendatang. Berbagai pihak menyambut positif keputusan ini, seraya menantikan implementasi regulasi teknis di lapangan.`,
  },
  {
    title: 'Narasi Dokumenter',
    presetId: 'narasi-dokumenter',
    tempoId: 'lambat',
    voiceId: 'Schedar',
    text: `Di balik kabut tebal pegunungan Jayawijaya, tersembunyi keheningan yang telah bertahan ribuan tahun. Salju abadi perlahan mencair... menjadi saksi bisu perjalanan waktu di bumi khatulistiwa. Di sinilah, setiap embusan angin membawa kisah tentang ketangguhan alam dan batas kehidupan manusia.`,
  },
  {
    title: 'Podcast Santai',
    presetId: 'podcast',
    tempoId: 'normal',
    voiceId: 'Puck',
    text: `Halo teman-teman! Gimana kabar kalian hari ini? Jadi kemarin aku nemu satu fakta unik banget soal kopi dan produktivitas. Ternyata, bukan cuma kafeinnya yang bikin melek, tapi juga aroma seduhan pertamanya yang langsung ngasih sinyal rileks ke otak kita. Keren banget kan?`,
  },
  {
    title: 'Misteri Makassar (Format SSML)',
    presetId: 'dramatis',
    tempoId: 'lambat',
    voiceId: 'Fenrir',
    text: `<speak>
  <emphasis level="strong">Janganlah kalian sekali-kali</emphasis> ikut berceloteh dan melayani permintaan orang gila yang biasa berkeliaran di sekitar kampung kalian.<break strength="medium"/>
  Karena... belum tentu dia <emphasis level="strong">masih hidup</emphasis>.<break strength="weak"/>
  That is so scary.<break strength="strong"/>
  Malam ini aku mau mengajak kalian menelusuri lorong misteri dari Kota Daeng, kota para pahlawan, kota <emphasis level="moderate">Makassar</emphasis>.<break strength="medium"/>
  Langsung aja without any further ado, <emphasis level="moderate">let's go</emphasis>!<break strength="strong"/>
  Makassar.<break strength="weak"/>
  Ibukota Provinsi Sulawesi Selatan, kota terbesar di kawasan Indonesia Timur.<break strength="medium"/>
  Kota ini ditemani oleh selat Makassar di sisi baratnya, dan sampai sekarang masih jadi pintu gerbang perdagangan dari dan ke timur Indonesia — sudah ratusan tahun, sejak zaman kerajaan Gowa-Tallo dan armada phinisi-nya.<break strength="medium"/>
  Kalau kalian datang ke Makassar, guys, kalian akan disambut dengan coto makassar, konro, pisang epe, dan sore-sore di pantai Losari sambil nunggu matahari turun ke laut.<break strength="medium"/>
  Warganya egaliter, nyawanya lurus, sapaannya satu kata aja: <emphasis level="moderate">Bung</emphasis>.<break strength="weak"/>
  Correct me if I'm wrong ya, teman-teman dari Makassar.<break strength="medium"/>
  Tapi selain kuliner dan senja Losari yang melegenda itu, kota Makassar juga menyimpan banyak sekali kisah mistis.<break strength="medium"/>
  Dari yang aku baca-baca, ada satu urban legend yang bikin merinding, dan ada dua entitas dari kepercayaan turun-temurun orang Bugis-Makassar yang sampai sekarang masih ditakuti.<break strength="strong"/>
  Dan yang pertama... mungkin yang paling dekat sama kehidupan kita.<break strength="strong"/>
  Guys, hampir setiap kampung di Indonesia — terutama di kampung-kampung pesisir Makassar — biasanya punya satu atau dua orang yang hilang akal.<break strength="medium"/>
  Warga sekitar mengenali mereka.<break strength="weak"/>
  Nama mereka hafal.<break strength="weak"/>
  Kadang dikasih makan, kadang dikasih rokok, kadang sekadar dicengkingin pas lewat.<break strength="strong"/>
  Dan dari sinilah cerita ini bermula.<break strength="weak"/>
  Menurut cerita turun-temurun — dan kisah semacam ini bukan cuma ada di satu kampung, lho — ada seorang bapak-bapak yang sudah bertahun-tahun berkeliaran di satu komplek perumahan di Makassar.<break strength="medium"/>
  Wujudnya: kurus, rambut kusut, baju yang sama setiap hari.<break strength="weak"/>
  Semua warga kenal dia.<break strength="medium"/>
  Bahkan ada yang bilang pernah melayani dia minta minum, ngobrol sebentar, tanya kabar.<break strength="strong"/>
  <emphasis level="moderate">Teman-teman.</emphasis><break strength="weak"/>
  Dia menjawab.<break strength="weak"/>
  Dia berceloteh.<break strength="weak"/>
  Dia menunjuk arah.<break strength="medium"/>
  Semua wajar.<break strength="weak"/>
  Semua... <emphasis level="strong">manusia</emphasis>.<break strength="strong"/>
  Sampai suatu hari — dari yang aku baca-baca, ini bermula dari hal sepele — ada warga yang penasaran, mencoba melacak asal-usul bapak itu.<break strength="medium"/>
  Siapa keluarganya? Dari mana asalnya?<break strength="medium"/>
  Dan inilah bagian yang bikin bulu kuduk berdiri: setelah ditelusuri dan ditanyakan ke sana kemari, ternyata bapak itu... <emphasis level="strong">sudah lama meninggal</emphasis>.<break strength="medium"/>
  Bertahun-tahun yang lalu.<break strength="weak"/>
  Ada yang bahkan menunjuk lokasi makamnya.<break strength="weak"/>
  So sad.<break strength="strong"/>
  Jadi pertanyaannya: selama ini, siapa yang warga percakapi setiap pagi? Siapa yang mereka kasih minum?<break strength="weak"/>
  Hah? Penghuninya siapa?<break strength="strong"/>
  Yang bikin makin seram, cerita semacam ini ada beberapa versi.<break strength="medium"/>
  Ada yang bilang setelah peristiwa itu, sosoknya tidak pernah terlihat lagi.<break strength="medium"/>
  Ada juga yang bilang — justru malam itu, di depan rumah warga yang melacak, terlihat orang berdiri.<break strength="weak"/>
  Diam.<break strength="weak"/>
  Menatap.<break strength="medium"/>
  Dan yang paling seram dari semua versinya: beberapa kesaksian menyebut, warga yang paling sering melayani dia mulai sakit-sakitan aneh setelah tahu kebenarannya.<break strength="strong"/>
  Kembali ke awal tadi, guys: jangan ikut berceloteh dengan orang gila di sekitar kampung kalian.<break strength="medium"/>
  Karena kita nggak pernah tahu... dia masih di dunia ini atau nggak.<break strength="medium"/>
  Ada yang pernah dengar cerita serupa dari kampung kalian? Komen di bawah.<break strength="weak"/>
  Coba konfirmasi buat aku.<break strength="strong"/>
  Next.<break strength="weak"/>
  Next, ada <emphasis level="strong">Ballakape</emphasis>.<break strength="strong"/>
  Dari yang aku baca-baca, ini salah satu entitas paling ditakuti di kepercayaan turun-temurun orang Bugis dan Makassar.<break strength="medium"/>
  Ballakape digambarkan sebagai roh jahat berwujud laki-laki... dengan <emphasis level="strong">janggut yang panjang dan lebat</emphasis>.<break strength="medium"/>
  Bayangin deh, tengah malam, kalian keluar dari rumah panggung, dan di bawah sana ada sosok laki-laki berdiri — berjanggut panjang, menatap kalian tanpa berkedip.<break strength="weak"/>
  That is so scary.<break strength="strong"/>
  Asal-usulnya, menurut cerita yang beredar, Ballakape sering dikaitkan dengan ilmu hitam.<break strength="medium"/>
  Konon ia dikirim, atau muncul, untuk mengganggu orang tertentu — dan cara ganggunya bukan main-main: orang yang kena gangguan Ballakape konon bisa berubah perilaku drastis, bicara dengan suara berbeda, bahkan punya kekuatan tidak wajar.<break strength="medium"/>
  Benar enggak ya, teman-teman dari Sulawesi Selatan? Correct me if I'm wrong.<break strength="strong"/>
  Ada yang menarik dari folklore ini, guys.<break strength="medium"/>
  Orang-orang dulu, untuk menghindari Ballakape, punya aturan main yang ketat: jangan sembarangan menjawab suara yang memanggil nama kita di malam hari sebelum kita yakin itu benar-benar orang.<break strength="medium"/>
  Karena konon, entitas semacam ini suka sekali menyamar.<break strength="weak"/>
  Berpura-pura jadi orang yang kita kenal.<break strength="weak"/>
  Berpura-pura... <emphasis level="strong">jadi manusia</emphasis>.<break strength="medium"/>
  Hampir mirip kisah pertama tadi, kan?<break strength="weak"/>
  Mungkin dari sinilah kepercayaan itu lahir: musuh paling berbahaya bukan yang tampak menyeramkan — tapi yang tampak... biasa.<break strength="strong"/>
  Ada yang pernah dengar nama Ballakape dari nenek moyangnya? Komen di bawah.<break strength="strong"/>
  Next.<break strength="weak"/>
  Next yang terakhir, ada <emphasis level="strong">Garagau</emphasis>.<break strength="strong"/>
  Kalau kalian punya teman dari Makassar atau Bugis, coba tanyain ke mereka: masa kecil mereka hampir pasti dihantui satu nama ini.<break strength="medium"/>
  Garagau adalah makhluk raksasa dari folklore Bugis-Makassar — dan perannya persis seperti hantu dalam dongeng kita semua: digunakan orang tua untuk menakut-nakuti anak-anak.<break strength="medium"/>
  <emphasis level="moderate">Jangan main sampai maghrib, nanti diambil Garagau.</emphasis><break strength="medium"/>
  Kalimat itu, guys, dihafal hampir setiap anak Bugis-Makassar.<break strength="strong"/>
  Wujudnya digambarkan sebagai sosok raksasa yang tinggal di tempat-tempat sepi — belukar, pepohonan besar, atau tempat yang jauh dari keramaian.<break strength="medium"/>
  Digambarkan sangat tinggi, kadang konon sampai menyerupai pohon kalau dilihat dari jauh.<break strength="medium"/>
  Dari kejauhan terlihat biasa... tapi kalau kalian perhatikan lama-lama... tiba-tiba... <emphasis level="strong">sosok itu bergerak</emphasis>.<break strength="weak"/>
  Ih, seram banget ya.<break strength="strong"/>
  Tapi guys, di balik fungsi dongeng penakut anak itu, ada lapisan yang lebih dalam.<break strength="medium"/>
  Orang Bugis-Makassar dulu percaya, anak-anak yang hilang tanpa jejak — kabur, jatuh ke sungai, nggak pulang-pulang — itu <emphasis level="moderate">diambil Garagau</emphasis>.<break strength="medium"/>
  Dan setelah kita dengar kisah-kisah tragis tentang anak-anak yang menghilang, tiba-tiba dongeng itu nggak terdengar konyol lagi.<break strength="weak"/>
  Dongeng itu... bekerja.<break strength="weak"/>
  Anak-anak pulang sebelum maghrib.<break strength="weak"/>
  Anak-anak selamat.<break strength="strong"/>
  So sad ya, kalau dipikir-pikir, makhluk ini lahir dari kekhawatiran orang tua yang luar biasa besar terhadap anak-anaknya.<break strength="medium"/>
  Semoga semua anak-anak di mana pun berada selalu dalam lindungan.<break strength="medium"/>
  Ada yang dulu dikejer-kejer pakai nama Garagau? Komen di bawah, coba konfirmasi.<break strength="strong"/>
  Oke guys, sampai di sini dulu perjalanan malam kita kali ini.<break strength="medium"/>
  Terima kasih banyak udah nonton sampai habis.<break strength="strong"/>
  Kalau kalian tahu kisah mistis lain dari Makassar atau kota kalian, atau mau request kota berikutnya, tulis aja di kolom komentar — atau kirim ceritanya ke email yang ada di description.<break strength="medium"/>
  Kalau ada yang salah mohon dibenarkan.<break strength="weak"/>
  Kalau ada yang benar, mohon disebarkan.<break strength="medium"/>
  Bye bye!
</speak>`,
  },
];
