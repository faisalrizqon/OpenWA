import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Search, Plus, Smile, Image as ImageIcon, X, Sparkles, Wand2 } from 'lucide-react';
import './EmojiStickerPicker.css';

export interface EmojiStickerPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSendSticker: (fileBase64: string, mimetype: string) => Promise<void> | void;
  onClose: () => void;
  disabled?: boolean;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

// ── Complete Unicode Emoji Dataset with Keywords ──────────────────────────────
interface EmojiItem {
  emoji: string;
  category: 'recent' | 'smileys' | 'animals' | 'food' | 'activities' | 'travel' | 'objects' | 'symbols' | 'flags';
  keywords: string[];
}

const EMOJI_CATEGORIES: Array<{ id: EmojiItem['category']; label: string; icon: string }> = [
  { id: 'recent', label: 'Terbaru', icon: '🕒' },
  { id: 'smileys', label: 'Wajah & Orang', icon: '😀' },
  { id: 'animals', label: 'Hewan & Alam', icon: '🐶' },
  { id: 'food', label: 'Makanan & Minuman', icon: '🍔' },
  { id: 'activities', label: 'Aktivitas', icon: '⚽' },
  { id: 'travel', label: 'Perjalanan & Tempat', icon: '🚗' },
  { id: 'objects', label: 'Objek & Alat', icon: '💡' },
  { id: 'symbols', label: 'Simbol & Hati', icon: '🔣' },
  { id: 'flags', label: 'Bendera', icon: '🚩' },
];

const RAW_EMOJIS: Array<{ emoji: string; category: EmojiItem['category']; keywords: string[] }> = [
  // Smileys & People
  { emoji: '😀', category: 'smileys', keywords: ['grinning', 'senyum', 'gembira', 'smile', 'happy'] },
  { emoji: '😃', category: 'smileys', keywords: ['smiley', 'senyum', 'bahagia', 'happy', 'joy'] },
  { emoji: '😄', category: 'smileys', keywords: ['smile', 'tertawa', 'senang', 'laugh'] },
  { emoji: '😁', category: 'smileys', keywords: ['grin', 'senyum lebar', 'meringis'] },
  { emoji: '😆', category: 'smileys', keywords: ['laughing', 'terbahak', 'ngakak', 'lol'] },
  { emoji: '😅', category: 'smileys', keywords: ['sweat', 'keringat', 'lega', 'awkward'] },
  { emoji: '🤣', category: 'smileys', keywords: ['rofl', 'guling-guling', 'ngakak', 'wkwk', 'lucu'] },
  { emoji: '😂', category: 'smileys', keywords: ['joy', 'tertawa air mata', 'wkwkwk', 'ngakak', 'lol'] },
  { emoji: '🙂', category: 'smileys', keywords: ['slightly smiling', 'senyum tipis'] },
  { emoji: '🙃', category: 'smileys', keywords: ['upside down', 'terbalik', 'sarkas'] },
  { emoji: '😉', category: 'smileys', keywords: ['wink', 'kedip', 'colek'] },
  { emoji: '😊', category: 'smileys', keywords: ['blush', 'senyum hangat', 'ramah'] },
  { emoji: '😇', category: 'smileys', keywords: ['angel', 'malaikat', 'polos', 'baik'] },
  { emoji: '🥰', category: 'smileys', keywords: ['love', 'cinta', 'sayang', 'gemas'] },
  { emoji: '😍', category: 'smileys', keywords: ['heart eyes', 'jatuh cinta', 'suka', 'naksir'] },
  { emoji: '🤩', category: 'smileys', keywords: ['star struck', 'kagum', 'bintang', 'keren'] },
  { emoji: '😘', category: 'smileys', keywords: ['kiss', 'cium', 'kissing'] },
  { emoji: '😋', category: 'smileys', keywords: ['yum', 'enak', 'lezat', 'lapar'] },
  { emoji: '😛', category: 'smileys', keywords: ['tongue', 'lidah', 'melet'] },
  { emoji: '😜', category: 'smileys', keywords: ['winking tongue', 'jail', 'iseng', 'lucu'] },
  { emoji: '🤪', category: 'smileys', keywords: ['zany', 'gila', 'kocak', 'acak'] },
  { emoji: '😝', category: 'smileys', keywords: ['squinting tongue', 'melet'] },
  { emoji: '🤑', category: 'smileys', keywords: ['money', 'cuan', 'uang', 'kaya', 'duit'] },
  { emoji: '🤗', category: 'smileys', keywords: ['hug', 'peluk', 'terima kasih'] },
  { emoji: '🤭', category: 'smileys', keywords: ['giggle', 'tutup mulut', 'ups'] },
  { emoji: '🤫', category: 'smileys', keywords: ['shh', 'diam', 'rahasia', 'sstt'] },
  { emoji: '🤔', category: 'smileys', keywords: ['thinking', 'mikir', 'pikir', 'bingung', 'ide'] },
  { emoji: '🤐', category: 'smileys', keywords: ['zipper', 'kunci mulut', 'rahasia'] },
  { emoji: '🤨', category: 'smileys', keywords: ['raised eyebrow', 'curiga', 'ragu'] },
  { emoji: '😐', category: 'smileys', keywords: ['neutral', 'datar', 'biasa'] },
  { emoji: '😑', category: 'smileys', keywords: ['expressionless', 'lempeng', 'capek'] },
  { emoji: '😶', category: 'smileys', keywords: ['no mouth', 'hening', 'bisu'] },
  { emoji: '😏', category: 'smileys', keywords: ['smirk', 'sombong', 'tahu'] },
  { emoji: '😒', category: 'smileys', keywords: ['unamused', 'ogah', 'males', 'sebal'] },
  { emoji: '🙄', category: 'smileys', keywords: ['rolling eyes', 'mutar mata', 'bosan'] },
  { emoji: '😬', category: 'smileys', keywords: ['grimace', 'nyengir', 'canggung'] },
  { emoji: '🤥', category: 'smileys', keywords: ['lying', 'bohong', 'pinokio'] },
  { emoji: '😌', category: 'smileys', keywords: ['relieved', 'lega', 'tenang'] },
  { emoji: '😔', category: 'smileys', keywords: ['pensive', 'murung', 'sedih'] },
  { emoji: '😪', category: 'smileys', keywords: ['sleepy', 'mengantuk', 'ngantuk'] },
  { emoji: '🤤', category: 'smileys', keywords: ['drooling', 'ngiler', 'iler'] },
  { emoji: '😴', category: 'smileys', keywords: ['sleeping', 'tidur', 'pulas'] },
  { emoji: '😷', category: 'smileys', keywords: ['mask', 'masker', 'sakit'] },
  { emoji: '🤒', category: 'smileys', keywords: ['thermometer', 'demam', 'panas'] },
  { emoji: '🤕', category: 'smileys', keywords: ['bandage', 'perban', 'terluka'] },
  { emoji: '🤢', category: 'smileys', keywords: ['nauseated', 'mual', 'enek'] },
  { emoji: '🤮', category: 'smileys', keywords: ['vomit', 'muntah'] },
  { emoji: '🤧', category: 'smileys', keywords: ['sneezing', 'bersin', 'pilek'] },
  { emoji: '🥵', category: 'smileys', keywords: ['hot', 'panas', 'gerah'] },
  { emoji: '🥶', category: 'smileys', keywords: ['cold', 'dingin', 'beku'] },
  { emoji: '🥴', category: 'smileys', keywords: ['woozy', 'pusing', 'teler'] },
  { emoji: '😵', category: 'smileys', keywords: ['dizzy', 'keliyengan'] },
  { emoji: '🤯', category: 'smileys', keywords: ['exploding head', 'meledak', 'kaget', 'mindblown'] },
  { emoji: '🤠', category: 'smileys', keywords: ['cowboy', 'koboi'] },
  { emoji: '🥳', category: 'smileys', keywords: ['party', 'pesta', 'selamat', 'ultah'] },
  { emoji: '😎', category: 'smileys', keywords: ['sunglasses', 'keren', 'cool', 'santai'] },
  { emoji: '🤓', category: 'smileys', keywords: ['nerd', 'kacamata', 'pinter'] },
  { emoji: '🧐', category: 'smileys', keywords: ['monocle', 'investigasi', 'cek'] },
  { emoji: '😕', category: 'smileys', keywords: ['confused', 'bingung'] },
  { emoji: '😟', category: 'smileys', keywords: ['worried', 'khawatir', 'cemas'] },
  { emoji: '🙁', category: 'smileys', keywords: ['frown', 'cemberut'] },
  { emoji: '😮', category: 'smileys', keywords: ['open mouth', 'kaget', 'wah', 'terkejut'] },
  { emoji: '😯', category: 'smileys', keywords: ['surprised', 'terpana'] },
  { emoji: '😲', category: 'smileys', keywords: ['astonished', 'syok'] },
  { emoji: '😳', category: 'smileys', keywords: ['flushed', 'malu', 'merona'] },
  { emoji: '🥺', category: 'smileys', keywords: ['pleading', 'mohon', 'pwease', 'memohon'] },
  { emoji: '😦', category: 'smileys', keywords: ['frowning'] },
  { emoji: '😨', category: 'smileys', keywords: ['fearful', 'takut'] },
  { emoji: '😰', category: 'smileys', keywords: ['anxious', 'cemas'] },
  { emoji: '😥', category: 'smileys', keywords: ['sad relief', 'sedih'] },
  { emoji: '😢', category: 'smileys', keywords: ['crying', 'menangis', 'air mata'] },
  { emoji: '😭', category: 'smileys', keywords: ['sob', 'nangis kencang', 'sedih sekali'] },
  { emoji: '😱', category: 'smileys', keywords: ['scream', 'teriak', 'histeris', 'kaget'] },
  { emoji: '😖', category: 'smileys', keywords: ['confounded'] },
  { emoji: '😣', category: 'smileys', keywords: ['persevering'] },
  { emoji: '😞', category: 'smileys', keywords: ['disappointed', 'kecewa'] },
  { emoji: '😓', category: 'smileys', keywords: ['sweat', 'keringat dingin'] },
  { emoji: '😩', category: 'smileys', keywords: ['weary', 'lelah'] },
  { emoji: '😫', category: 'smileys', keywords: ['tired', 'capek', 'letih'] },
  { emoji: '🥱', category: 'smileys', keywords: ['yawn', 'menguap', 'bosan'] },
  { emoji: '😤', category: 'smileys', keywords: ['triumph', 'kesal', 'geram'] },
  { emoji: '😡', category: 'smileys', keywords: ['rage', 'marah', 'ngamuk'] },
  { emoji: '😠', category: 'smileys', keywords: ['angry', 'marah'] },
  { emoji: '🤬', category: 'smileys', keywords: ['cursing', 'sumpah', 'marah banget'] },
  { emoji: '💀', category: 'smileys', keywords: ['skull', 'tengkorak', 'mati ketawa'] },
  { emoji: '💩', category: 'smileys', keywords: ['poop', 'tahi', 'pup'] },
  { emoji: '🤡', category: 'smileys', keywords: ['clown', 'badut', 'lucu'] },
  { emoji: '👻', category: 'smileys', keywords: ['ghost', 'hantu'] },
  { emoji: '👽', category: 'smileys', keywords: ['alien', 'luar angkasa'] },
  { emoji: '🤖', category: 'smileys', keywords: ['robot', 'bot'] },
  { emoji: '😺', category: 'smileys', keywords: ['cat smile', 'kucing senyum'] },
  { emoji: '😸', category: 'smileys', keywords: ['cat grin', 'kucing'] },
  { emoji: '😹', category: 'smileys', keywords: ['cat joy', 'kucing ngakak'] },
  { emoji: '😻', category: 'smileys', keywords: ['cat heart', 'kucing cinta'] },
  { emoji: '😼', category: 'smileys', keywords: ['cat smirk', 'kucing'] },
  { emoji: '😽', category: 'smileys', keywords: ['cat kiss', 'kucing cium'] },
  { emoji: '🙀', category: 'smileys', keywords: ['cat scream', 'kucing kaget'] },
  { emoji: '😿', category: 'smileys', keywords: ['cat cry', 'kucing nangis'] },
  { emoji: '😾', category: 'smileys', keywords: ['cat pout', 'kucing ngambek'] },
  { emoji: '👋', category: 'smileys', keywords: ['wave', 'hai', 'halo', 'dadah'] },
  { emoji: '✋', category: 'smileys', keywords: ['hand', 'stop', 'tangan'] },
  { emoji: '👌', category: 'smileys', keywords: ['ok hand', 'oke', 'sip', 'mantap'] },
  { emoji: '🤌', category: 'smileys', keywords: ['pinched', 'kenapa', 'maksud'] },
  { emoji: '✌️', category: 'smileys', keywords: ['peace', 'damai', 'dua'] },
  { emoji: '🤞', category: 'smileys', keywords: ['crossed fingers', 'berharap'] },
  { emoji: '🤟', category: 'smileys', keywords: ['ily', 'love you', 'metal'] },
  { emoji: '🤘', category: 'smileys', keywords: ['rock on', 'metal'] },
  { emoji: '🤙', category: 'smileys', keywords: ['call me', 'telepon', 'santai'] },
  { emoji: '👈', category: 'smileys', keywords: ['point left', 'kiri'] },
  { emoji: '👉', category: 'smileys', keywords: ['point right', 'kanan'] },
  { emoji: '👆', category: 'smileys', keywords: ['point up', 'atas'] },
  { emoji: '👇', category: 'smileys', keywords: ['point down', 'bawah'] },
  { emoji: '👍', category: 'smileys', keywords: ['thumbs up', 'jempol', 'bagus', 'setuju', 'oke', 'sip'] },
  { emoji: '👎', category: 'smileys', keywords: ['thumbs down', 'jempol bawah', 'kurang'] },
  { emoji: '✊', category: 'smileys', keywords: ['fist', 'semangat'] },
  { emoji: '👊', category: 'smileys', keywords: ['punch', 'tos', 'fist bump'] },
  { emoji: '👏', category: 'smileys', keywords: ['clap', 'tepuk tangan', 'hebat', 'mantap'] },
  { emoji: '🙌', category: 'smileys', keywords: ['raised hands', 'hore', 'alhamdulillah'] },
  { emoji: '👐', category: 'smileys', keywords: ['open hands', 'terbuka'] },
  { emoji: '🤲', category: 'smileys', keywords: ['palms up', 'doa', 'berdoa'] },
  { emoji: '🤝', category: 'smileys', keywords: ['handshake', 'jabat tangan', 'sepakat', 'deal'] },
  { emoji: '🙏', category: 'smileys', keywords: ['pray', 'tolong', 'terima kasih', 'makasih', 'maaf', 'sungkem'] },
  { emoji: '💪', category: 'smileys', keywords: ['muscle', 'otot', 'kuat', 'semangat'] },

  // Animals & Nature
  { emoji: '🐶', category: 'animals', keywords: ['dog', 'anjing', 'puppy'] },
  { emoji: '🐱', category: 'animals', keywords: ['cat', 'kucing', 'kitten'] },
  { emoji: '🐭', category: 'animals', keywords: ['mouse', 'tikus'] },
  { emoji: '🐰', category: 'animals', keywords: ['rabbit', 'kelinci'] },
  { emoji: '🦊', category: 'animals', keywords: ['fox', 'rubah'] },
  { emoji: '🐻', category: 'animals', keywords: ['bear', 'beruang'] },
  { emoji: '🐼', category: 'animals', keywords: ['panda'] },
  { emoji: '🐨', category: 'animals', keywords: ['koala'] },
  { emoji: '🐯', category: 'animals', keywords: ['tiger', 'harimau'] },
  { emoji: '🦁', category: 'animals', keywords: ['lion', 'singa'] },
  { emoji: '🐮', category: 'animals', keywords: ['cow', 'sapi'] },
  { emoji: '🐷', category: 'animals', keywords: ['pig', 'babi'] },
  { emoji: '🐸', category: 'animals', keywords: ['frog', 'katak'] },
  { emoji: '🐵', category: 'animals', keywords: ['monkey', 'monyet'] },
  { emoji: '🐔', category: 'animals', keywords: ['chicken', 'ayam'] },
  { emoji: '🐧', category: 'animals', keywords: ['penguin'] },
  { emoji: '🐦', category: 'animals', keywords: ['bird', 'burung'] },
  { emoji: '🦆', category: 'animals', keywords: ['duck', 'bebek'] },
  { emoji: '🦅', category: 'animals', keywords: ['eagle', 'elang'] },
  { emoji: '🦉', category: 'animals', keywords: ['owl', 'burung hantu'] },
  { emoji: '🐺', category: 'animals', keywords: ['wolf', 'serigala'] },
  { emoji: '🐴', category: 'animals', keywords: ['horse', 'kuda'] },
  { emoji: '🦄', category: 'animals', keywords: ['unicorn'] },
  { emoji: '🐝', category: 'animals', keywords: ['bee', 'lebah'] },
  { emoji: '🦋', category: 'animals', keywords: ['butterfly', 'kupu-kupu'] },
  { emoji: '🐢', category: 'animals', keywords: ['turtle', 'kura-kura'] },
  { emoji: '🐍', category: 'animals', keywords: ['snake', 'ular'] },
  { emoji: '🐬', category: 'animals', keywords: ['dolphin', 'lumba-lumba'] },
  { emoji: '🐳', category: 'animals', keywords: ['whale', 'paus'] },
  { emoji: '🦈', category: 'animals', keywords: ['shark', 'hiu'] },
  { emoji: '🐊', category: 'animals', keywords: ['crocodile', 'buaya'] },
  { emoji: '🌲', category: 'animals', keywords: ['tree', 'pohon', 'pinus'] },
  { emoji: '🌴', category: 'animals', keywords: ['palm tree', 'pohon kelapa', 'pantai'] },
  { emoji: '🌸', category: 'animals', keywords: ['flower', 'bunga', 'sakura'] },
  { emoji: '🌹', category: 'animals', keywords: ['rose', 'mawar', 'romantis'] },
  { emoji: '🌻', category: 'animals', keywords: ['sunflower', 'matahari'] },
  { emoji: '🍀', category: 'animals', keywords: ['clover', 'hoki', 'keberuntungan'] },
  { emoji: '🍁', category: 'animals', keywords: ['maple', 'daun gugur'] },

  // Food & Drink
  { emoji: '🍏', category: 'food', keywords: ['apple', 'apel hijau'] },
  { emoji: '🍎', category: 'food', keywords: ['red apple', 'apel merah'] },
  { emoji: '🍌', category: 'food', keywords: ['banana', 'pisang'] },
  { emoji: '🍉', category: 'food', keywords: ['watermelon', 'semangka'] },
  { emoji: '🍇', category: 'food', keywords: ['grapes', 'anggur'] },
  { emoji: '🍓', category: 'food', keywords: ['strawberry', 'stroberi'] },
  { emoji: '🍒', category: 'food', keywords: ['cherry', 'ceri'] },
  { emoji: '🥭', category: 'food', keywords: ['mango', 'mangga'] },
  { emoji: '🍍', category: 'food', keywords: ['pineapple', 'nanas'] },
  { emoji: '🥥', category: 'food', keywords: ['coconut', 'kelapa'] },
  { emoji: '🥑', category: 'food', keywords: ['avocado', 'alpukat'] },
  { emoji: '🌽', category: 'food', keywords: ['corn', 'jagung'] },
  { emoji: '🌶️', category: 'food', keywords: ['chili', 'cabai', 'pedas'] },
  { emoji: '🍞', category: 'food', keywords: ['bread', 'roti'] },
  { emoji: '🧀', category: 'food', keywords: ['cheese', 'keju'] },
  { emoji: '🍗', category: 'food', keywords: ['chicken', 'ayam goreng'] },
  { emoji: '🥩', category: 'food', keywords: ['meat', 'daging', 'steak'] },
  { emoji: '🍔', category: 'food', keywords: ['burger', 'hamburger'] },
  { emoji: '🍟', category: 'food', keywords: ['fries', 'kentang goreng'] },
  { emoji: '🍕', category: 'food', keywords: ['pizza'] },
  { emoji: '🌭', category: 'food', keywords: ['hotdog'] },
  { emoji: '🥪', category: 'food', keywords: ['sandwich'] },
  { emoji: '🍜', category: 'food', keywords: ['ramen', 'mie', 'bakso', 'soup'] },
  { emoji: '🍝', category: 'food', keywords: ['spaghetti', 'pasta'] },
  { emoji: '🍣', category: 'food', keywords: ['sushi'] },
  { emoji: '🍱', category: 'food', keywords: ['bento'] },
  { emoji: '🍛', category: 'food', keywords: ['curry', 'kari', 'nasi'] },
  { emoji: '🍚', category: 'food', keywords: ['rice', 'nasi'] },
  { emoji: '🥟', category: 'food', keywords: ['dumpling', 'dimsum'] },
  { emoji: '🍦', category: 'food', keywords: ['ice cream', 'es krim'] },
  { emoji: '🍰', category: 'food', keywords: ['cake', 'kue', 'bolu'] },
  { emoji: '🎂', category: 'food', keywords: ['birthday cake', 'ulang tahun', 'kue'] },
  { emoji: '🍩', category: 'food', keywords: ['donut', 'donat'] },
  { emoji: '🍪', category: 'food', keywords: ['cookie', 'kukis'] },
  { emoji: '🍫', category: 'food', keywords: ['chocolate', 'cokelat'] },
  { emoji: '🍿', category: 'food', keywords: ['popcorn'] },
  { emoji: '☕', category: 'food', keywords: ['coffee', 'kopi', 'ngopi', 'santai', 'cafe'] },
  { emoji: '🍵', category: 'food', keywords: ['tea', 'teh'] },
  { emoji: '🧃', category: 'food', keywords: ['juice', 'jus'] },
  { emoji: '🥤', category: 'food', keywords: ['soda', 'minuman'] },
  { emoji: '🧋', category: 'food', keywords: ['boba', 'bubble tea'] },
  { emoji: '🍺', category: 'food', keywords: ['beer', 'bir'] },

  // Activities & Objects
  { emoji: '⚽', category: 'activities', keywords: ['soccer', 'sepak bola', 'bola'] },
  { emoji: '🏀', category: 'activities', keywords: ['basketball', 'basket'] },
  { emoji: '🏸', category: 'activities', keywords: ['badminton', 'bulutangkis'] },
  { emoji: '🎮', category: 'activities', keywords: ['game', 'gaming', 'playstation', 'gamepad'] },
  { emoji: '🏆', category: 'activities', keywords: ['trophy', 'piala', 'juara', 'menang'] },
  { emoji: '🥇', category: 'activities', keywords: ['first medal', 'emas', 'juara 1'] },
  { emoji: '🎬', category: 'activities', keywords: ['movie', 'film', 'bioskop', 'kamera'] },
  { emoji: '🎧', category: 'activities', keywords: ['headphones', 'musik', 'lagu'] },
  { emoji: '🚗', category: 'travel', keywords: ['car', 'mobil', 'otw', 'jalan'] },
  { emoji: '🛵', category: 'travel', keywords: ['scooter', 'motor matic'] },
  { emoji: '✈️', category: 'travel', keywords: ['airplane', 'pesawat', 'terbang', 'liburan'] },
  { emoji: '🚀', category: 'travel', keywords: ['rocket', 'roket', 'cepat', 'gass'] },
  { emoji: '📷', category: 'objects', keywords: ['camera', 'kamera', 'foto', 'digicam', 'sewa', 'lens'] },
  { emoji: '📸', category: 'objects', keywords: ['camera flash', 'jepret', 'foto', 'kamera'] },
  { emoji: '📹', category: 'objects', keywords: ['video camera', 'rekam', 'video'] },
  { emoji: '💻', category: 'objects', keywords: ['laptop', 'komputer', 'kerja'] },
  { emoji: '📱', category: 'objects', keywords: ['phone', 'hp', 'handphone', 'wa'] },
  { emoji: '💡', category: 'objects', keywords: ['lightbulb', 'lampu', 'ide', 'solusi'] },
  { emoji: '🔥', category: 'objects', keywords: ['fire', 'api', 'hot', 'panas', 'mantap', 'gass'] },
  { emoji: '✨', category: 'objects', keywords: ['sparkles', 'keren', 'cantik', 'bintang'] },
  { emoji: '🎉', category: 'objects', keywords: ['party popper', 'selamat', 'hore', 'sukses'] },
  { emoji: '💰', category: 'objects', keywords: ['money bag', 'uang', 'cuan', 'rupiah', 'bayar'] },
  { emoji: '💳', category: 'objects', keywords: ['credit card', 'kartu kredit', 'transfer', 'atm'] },
  { emoji: '📦', category: 'objects', keywords: ['package', 'paket', 'kiriman', 'cod'] },
  { emoji: '📍', category: 'objects', keywords: ['pin', 'lokasi', 'tempat', 'maps'] },
  { emoji: '❤️', category: 'symbols', keywords: ['red heart', 'hati', 'cinta', 'love', 'merah'] },
  { emoji: '💚', category: 'symbols', keywords: ['green heart', 'wa', 'hijau'] },
  { emoji: '💯', category: 'symbols', keywords: ['100', 'seratus', 'sempurna', 'mantap'] },
  { emoji: '✅', category: 'symbols', keywords: ['check', 'centang', 'selesai', 'lunas', 'berhasil'] },
  { emoji: '⭐', category: 'symbols', keywords: ['star', 'bintang', 'favorit'] },
  { emoji: '🇮🇩', category: 'flags', keywords: ['indonesia', 'merah putih'] },
];

// ── Native WhatsApp Stickers (Transparent, Clean Vector Graphic Stickers) ──────
export interface PresetSticker {
  id: string;
  title: string;
  category: 'rental' | 'reactions' | 'animals';
  badgeColor: string;
  icon: string;
  label: string;
  sublabel?: string;
}

const PRESET_STICKERS: PresetSticker[] = [
  // Rental & Bisnis Chat
  { id: 'stk_siapp', title: 'Siappp Kak!', category: 'rental', badgeColor: '#128c7e', icon: '🙏', label: 'SIAPPP KAK!', sublabel: 'Terima kasih' },
  { id: 'stk_otw', title: 'OTW Kak!', category: 'rental', badgeColor: '#25d366', icon: '🛵', label: 'OTW KAK 🚀', sublabel: 'Meluncur ke lokasi' },
  { id: 'stk_mantap', title: 'Mantap!', category: 'rental', badgeColor: '#0284c7', icon: '👍', label: 'MANTAPP!', sublabel: 'Keren abis' },
  { id: 'stk_makasih', title: 'Terima Kasih!', category: 'rental', badgeColor: '#ea580c', icon: '🥕', label: 'MAKASIH BANYAK 🐰', sublabel: 'Sehat selalu ya kak' },
  { id: 'stk_cek_foto', title: 'Cek Foto!', category: 'rental', badgeColor: '#7c3aed', icon: '📸', label: 'CEK FOTO KAK', sublabel: 'Link gdrive siap' },
  { id: 'stk_lunas', title: 'Sudah Lunas', category: 'rental', badgeColor: '#16a34a', icon: '✅', label: 'LUNAS YA KAK', sublabel: 'Terverifikasi' },
  { id: 'stk_oke', title: 'Oke Siap', category: 'rental', badgeColor: '#059669', icon: '👌', label: 'OKE SIAP', sublabel: 'Diproses segera' },
  { id: 'stk_gas', title: 'Gasss!', category: 'rental', badgeColor: '#dc2626', icon: '🔥', label: 'GASS KUMENDAN', sublabel: 'Siap selalu' },

  // Meme & Reaksi
  { id: 'stk_timmy', title: 'Timmy Derp', category: 'reactions', badgeColor: '#334155', icon: '🐑', label: 'HAHH?? 😳', sublabel: 'Beneran kak?!' },
  { id: 'stk_wkwk', title: 'Wkwkwk', category: 'reactions', badgeColor: '#f59e0b', icon: '🤣', label: 'WKWKWK', sublabel: 'Bisa aja nih' },
  { id: 'stk_walawee', title: 'Walawee', category: 'reactions', badgeColor: '#fb923c', icon: '🐱', label: 'WALAWEE 😸', sublabel: 'Aseekk' },
  { id: 'stk_santuy', title: 'Santuy', category: 'reactions', badgeColor: '#0ea5e9', icon: '☕', label: 'SANTUY DULU', sublabel: 'Aman terkendali' },
  { id: 'stk_syok', title: 'Kaget', category: 'reactions', badgeColor: '#ef4444', icon: '😱', label: 'WADUHHH!', sublabel: 'Kaget banget' },
  { id: 'stk_menangis', title: 'Terharu', category: 'reactions', badgeColor: '#6366f1', icon: '😭', label: 'TERHARU 🥺', sublabel: 'Makasih kak' },
  { id: 'stk_lope', title: 'Lope Lope', category: 'reactions', badgeColor: '#e11d48', icon: '🥰', label: 'BUAT KAMU 💖', sublabel: 'Bintang 5 pokoknya' },

  // Hewan Lucu
  { id: 'stk_cat_gemoy', title: 'Kucing Meow', category: 'animals', badgeColor: '#f97316', icon: '🐾', label: 'MEOWWW', sublabel: 'Halo kakk' },
  { id: 'stk_doge', title: 'Doge Much', category: 'animals', badgeColor: '#eab308', icon: '🐶', label: 'SO WOW MUCH', sublabel: 'Best digicam' },
  { id: 'stk_panda', title: 'Panda Rehat', category: 'animals', badgeColor: '#475569', icon: '🐼', label: 'REHAT DULU', sublabel: 'Ngopi santai' },
  { id: 'stk_kelinci', title: 'Kelinci Imut', category: 'animals', badgeColor: '#ec4899', icon: '🐰', label: 'LUV U KAK', sublabel: 'Sehat selalu' },
];

/**
 * Generate native WhatsApp WebP sticker Canvas (Transparent background, white sticker outline)
 */
async function generateStickerBase64(sticker: PresetSticker): Promise<{ base64: string; mimetype: string }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve({ base64: '', mimetype: 'image/webp' });
      return;
    }

    ctx.clearRect(0, 0, 512, 512);

    // Rounded die-cut sticker badge
    const radius = 56;
    ctx.beginPath();
    ctx.moveTo(36 + radius, 36);
    ctx.lineTo(476 - radius, 36);
    ctx.quadraticCurveTo(476, 36, 476, 36 + radius);
    ctx.lineTo(476, 476 - radius);
    ctx.quadraticCurveTo(476, 476, 476 - radius, 476);
    ctx.lineTo(36 + radius, 476);
    ctx.quadraticCurveTo(36, 476, 36, 476 - radius);
    ctx.lineTo(36, 36 + radius);
    ctx.quadraticCurveTo(36, 36, 36 + radius, 36);
    ctx.closePath();

    // Solid fill
    ctx.fillStyle = sticker.badgeColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.fill();

    // Reset shadow & draw thick white die-cut sticker stroke
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Draw main icon
    if (sticker.icon) {
      ctx.font = '144px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.icon, 256, 185);
    }

    // Draw sticker primary text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sticker.label, 256, 325);

    // Draw sublabel
    if (sticker.sublabel) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.font = '500 25px system-ui, -apple-system, sans-serif';
      ctx.fillText(sticker.sublabel, 256, 385);
    }

    const dataUrl = canvas.toDataURL('image/webp', 0.9);
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    resolve({ base64, mimetype: 'image/webp' });
  });
}

/**
 * Convert user uploaded image (PNG/JPG/GIF) to 512x512 square WebP sticker
 */
async function convertFileToStickerBase64(file: File): Promise<{ base64: string; mimetype: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }

        ctx.clearRect(0, 0, 512, 512);

        const maxDim = 490;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }

        const x = Math.round((512 - w) / 2);
        const y = Math.round((512 - h) / 2);

        ctx.drawImage(img, x, y, w, h);

        const dataUrl = canvas.toDataURL('image/webp', 0.92);
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        resolve({ base64, mimetype: 'image/webp' });
      };
      img.onerror = () => reject(new Error('Gagal memuat gambar'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

export function EmojiStickerPicker({
  onSelectEmoji,
  onSendSticker,
  onClose,
  disabled = false,
  triggerRef,
}: EmojiStickerPickerProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (popupRef.current && popupRef.current.contains(target)) {
        return;
      }
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.querySelector('[role="dialog"], [role="menu"]')) return;
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, triggerRef]);
  // Mode: 'emoji' or 'sticker'
  const [activeTab, setActiveTab] = useState<'emoji' | 'sticker'>('sticker');

  // Emoji category
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<EmojiItem['category']>('smileys');

  // Sticker category
  const [activeStickerCategory, setActiveStickerCategory] = useState<'all' | 'rental' | 'reactions' | 'animals'>('all');

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sending state
  const [isSendingSticker, setIsSendingSticker] = useState<boolean>(false);

  // Recent emojis from localStorage
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('openwa_recent_emojis');
      return stored ? JSON.parse(stored) : ['😀', '😂', '👍', '❤️', '🔥', '🙏', '✨', '📸'];
    } catch {
      return ['😀', '😂', '👍', '❤️', '🔥', '🙏'];
    }
  });

  const customStickerInputRef = useRef<HTMLInputElement | null>(null);

  const handleEmojiClick = (emoji: string) => {
    onSelectEmoji(emoji);
    setRecentEmojis(prev => {
      const updated = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 32);
      try {
        localStorage.setItem('openwa_recent_emojis', JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  };

  const displayedEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return RAW_EMOJIS.filter(
        item =>
          item.emoji.includes(q) ||
          item.keywords.some(k => k.toLowerCase().includes(q))
      ).map(item => item.emoji);
    }

    if (activeEmojiCategory === 'recent') {
      return recentEmojis;
    }

    return RAW_EMOJIS.filter(item => item.category === activeEmojiCategory).map(item => item.emoji);
  }, [searchQuery, activeEmojiCategory, recentEmojis]);

  const displayedStickers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return PRESET_STICKERS.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.label.toLowerCase().includes(q) ||
          (s.sublabel && s.sublabel.toLowerCase().includes(q))
      );
    }

    if (activeStickerCategory === 'all') {
      return PRESET_STICKERS;
    }

    return PRESET_STICKERS.filter(s => s.category === activeStickerCategory);
  }, [searchQuery, activeStickerCategory]);

  const handlePresetStickerClick = async (sticker: PresetSticker) => {
    if (disabled || isSendingSticker) return;
    try {
      setIsSendingSticker(true);
      const { base64, mimetype } = await generateStickerBase64(sticker);
      if (base64) {
        await onSendSticker(base64, mimetype);
      }
    } finally {
      setIsSendingSticker(false);
    }
  };

  const handleCustomStickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || disabled || isSendingSticker) return;

    try {
      setIsSendingSticker(true);
      const { base64, mimetype } = await convertFileToStickerBase64(file);
      if (base64) {
        await onSendSticker(base64, mimetype);
      }
    } catch (err) {
      console.error('Failed to create custom sticker:', err);
    } finally {
      setIsSendingSticker(false);
    }
  };

  return (
    <div ref={popupRef} className="wa-picker-popup chats-emoji-picker">
      {/* 1. TOP SUBHEADER (WhatsApp Native Style with Search on left & Segmented Control in center) */}
      <div className="wa-picker-subnav">
        {/* Left: Search Toggle */}
        <button
          type="button"
          onClick={() => {
            setIsSearchOpen(prev => !prev);
            if (isSearchOpen) setSearchQuery('');
          }}
          className={`wa-subnav-icon-btn ${isSearchOpen ? 'active' : ''}`}
          title="Cari"
        >
          <Search size={22} strokeWidth={2.2} />
        </button>

        {/* Center: Segmented Tabs (Emoji / Sticker) */}
        <div className="wa-subnav-segmented-pill">
          <button
            type="button"
            className={`wa-seg-tab ${activeTab === 'emoji' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('emoji');
              setSearchQuery('');
            }}
            title="Emoji"
          >
            <Smile size={23} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            className={`wa-seg-tab ${activeTab === 'sticker' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('sticker');
              setSearchQuery('');
            }}
            title="Stiker"
          >
            <ImageIcon size={23} strokeWidth={2.4} />
          </button>
        </div>

        {/* Right: Close button */}
        <button
          type="button"
          onClick={onClose}
          className="wa-subnav-icon-btn"
          title="Tutup Keyboard"
        >
          <X size={22} strokeWidth={2.2} />
        </button>
      </div>

      {/* 2. SEARCH INPUT (Appears when search is clicked) */}
      {isSearchOpen && (
        <div className="wa-picker-search-bar">
          <input
            type="text"
            autoFocus
            placeholder={activeTab === 'emoji' ? 'Cari emoji…' : 'Cari stiker WhatsApp…'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="wa-picker-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="wa-picker-search-clear"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* 3. MAIN GRID VIEW */}
      <div className="wa-picker-scroll-body">
        {activeTab === 'emoji' ? (
          /* EMOJI VIEW */
          <div className="wa-emoji-section">
            <div className="wa-emoji-grid">
              {displayedEmojis.map((emoji, idx) => (
                <button
                  key={`${emoji}_${idx}`}
                  type="button"
                  className="wa-emoji-cell-btn"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* STICKER VIEW (4-column native transparent stickers) */
          <div className="wa-sticker-section">
            <input
              type="file"
              ref={customStickerInputRef}
              accept="image/*,.webp"
              style={{ display: 'none' }}
              onChange={handleCustomStickerUpload}
            />

            <div className="wa-sticker-native-grid">
              {/* Tile 1: Create Sticker */}
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => customStickerInputRef.current?.click()}
                  className="wa-sticker-create-card"
                  title="Buat stiker dari foto/gambar Anda"
                  disabled={disabled || isSendingSticker}
                >
                  <div className="wa-create-wand-icon">
                    <Wand2 size={22} />
                  </div>
                  <span className="wa-create-wand-text">Buat stiker</span>
                </button>
              )}

              {/* Native WhatsApp Sticker Items */}
              {displayedStickers.map(stk => (
                <button
                  key={stk.id}
                  type="button"
                  onClick={() => handlePresetStickerClick(stk)}
                  className="wa-sticker-native-item"
                  title={`Kirim: ${stk.title}`}
                  disabled={disabled || isSendingSticker}
                >
                  <div className="wa-sticker-graphic-badge" style={{ backgroundColor: stk.badgeColor }}>
                    <span className="wa-stk-badge-icon">{stk.icon}</span>
                    <span className="wa-stk-badge-text">{stk.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {isSendingSticker && (
              <div className="wa-sticker-loading-overlay">
                <span>Mengirim stiker…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. BOTTOM PACK NAVIGATION BAR (Clock, Star, Pack Icons, +) */}
      <div className="wa-picker-pack-bar">
        {activeTab === 'emoji' ? (
          <div className="wa-pack-icons-row">
            {EMOJI_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`wa-pack-btn ${activeEmojiCategory === cat.id && !searchQuery ? 'active' : ''}`}
                title={cat.label}
                onClick={() => {
                  setActiveEmojiCategory(cat.id);
                  setSearchQuery('');
                }}
              >
                <span>{cat.icon}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="wa-pack-icons-row">
            <button
              type="button"
              className={`wa-pack-btn ${activeStickerCategory === 'all' && !searchQuery ? 'active' : ''}`}
              title="Semua Stiker"
              onClick={() => {
                setActiveStickerCategory('all');
                setSearchQuery('');
              }}
            >
              <Sparkles size={22} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className={`wa-pack-btn ${activeStickerCategory === 'rental' && !searchQuery ? 'active' : ''}`}
              title="Bisnis & Chat"
              onClick={() => {
                setActiveStickerCategory('rental');
                setSearchQuery('');
              }}
            >
              <span>💼</span>
            </button>
            <button
              type="button"
              className={`wa-pack-btn ${activeStickerCategory === 'reactions' && !searchQuery ? 'active' : ''}`}
              title="Meme & Reaksi"
              onClick={() => {
                setActiveStickerCategory('reactions');
                setSearchQuery('');
              }}
            >
              <span>🤣</span>
            </button>
            <button
              type="button"
              className={`wa-pack-btn ${activeStickerCategory === 'animals' && !searchQuery ? 'active' : ''}`}
              title="Hewan Lucu"
              onClick={() => {
                setActiveStickerCategory('animals');
                setSearchQuery('');
              }}
            >
              <span>🐾</span>
            </button>

            <button
              type="button"
              onClick={() => customStickerInputRef.current?.click()}
              className="wa-pack-btn wa-pack-plus-btn"
              title="Tambah stiker baru"
            >
              <Plus size={22} strokeWidth={2.4} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmojiStickerPicker;
