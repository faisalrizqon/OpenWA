import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Smile,
  X,
  Clock,
  Star,
  Heart,
  ThumbsUp,
  Frown,
  Flame,
  Coffee,
  Sparkles,
  Loader2,
  PawPrint,
  Globe,
  Car,
  Lightbulb,
  Music,
  Flag,
} from 'lucide-react';
import './EmojiStickerPicker.css';

export interface EmojiStickerPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSendSticker: (fileBase64: string, mimetype: string) => Promise<void> | void;
  onClose: () => void;
  disabled?: boolean;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

// ── WhatsApp Folded Sticker Icon ──────────────────────────────────────────────
const WAStickerFoldedIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: 'block', flexShrink: 0 }}
  >
    <path d="M5 3h14a2 2 0 0 1 2 2v10l-5 5H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M16 15h5l-5 5v-5z" fill="currentColor" stroke="none" />
  </svg>
);

// ── Complete Unicode Emoji Dataset with Keywords ──────────────────────────────
interface EmojiItem {
  emoji: string;
  category: 'recent' | 'smileys' | 'animals' | 'food' | 'activities' | 'travel' | 'objects' | 'symbols' | 'flags';
  keywords: string[];
}

interface EmojiCategoryTab {
  id: EmojiItem['category'];
  label: string;
  icon: React.ReactNode;
}

const EMOJI_CATEGORIES: EmojiCategoryTab[] = [
  { id: 'recent', label: 'Recent', icon: <Clock size={19} strokeWidth={1.8} /> },
  { id: 'smileys', label: 'Smileys & People', icon: <Smile size={19} strokeWidth={1.8} /> },
  { id: 'animals', label: 'Animals & Nature', icon: <PawPrint size={19} strokeWidth={1.8} /> },
  { id: 'food', label: 'Food & Drink', icon: <Coffee size={19} strokeWidth={1.8} /> },
  { id: 'activities', label: 'Activities', icon: <Globe size={19} strokeWidth={1.8} /> },
  { id: 'travel', label: 'Travel & Places', icon: <Car size={19} strokeWidth={1.8} /> },
  { id: 'objects', label: 'Objects', icon: <Lightbulb size={19} strokeWidth={1.8} /> },
  { id: 'symbols', label: 'Symbols', icon: <Music size={19} strokeWidth={1.8} /> },
  { id: 'flags', label: 'Flags', icon: <Flag size={19} strokeWidth={1.8} /> },
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
  { emoji: '👋', category: 'smileys', keywords: ['wave', 'halo', 'dadah', 'hi'] },
  { emoji: '🤚', category: 'smileys', keywords: ['raised back of hand', 'stop'] },
  { emoji: '🖐️', category: 'smileys', keywords: ['hand', 'lima', 'tos'] },
  { emoji: '✋', category: 'smileys', keywords: ['high five', 'tangan', 'angkat'] },
  { emoji: '🖖', category: 'smileys', keywords: ['vulcan', 'spock'] },
  { emoji: '👌', category: 'smileys', keywords: ['ok', 'oke', 'mantap', 'siap'] },
  { emoji: '🤌', category: 'smileys', keywords: ['pinched', 'italia', 'apa'] },
  { emoji: '🤏', category: 'smileys', keywords: ['pinching', 'sedikit', 'dikit'] },
  { emoji: '✌️', category: 'smileys', keywords: ['peace', 'damai', 'dua'] },
  { emoji: '🤞', category: 'smileys', keywords: ['crossed fingers', 'berharap', 'semoga'] },
  { emoji: '🤟', category: 'smileys', keywords: ['love you', 'metal', 'ily'] },
  { emoji: '🤘', category: 'smileys', keywords: ['rock on', 'metal'] },
  { emoji: '🤙', category: 'smileys', keywords: ['call me', 'santuy', 'shaka'] },
  { emoji: '👈', category: 'smileys', keywords: ['left', 'kiri', 'tunjuk'] },
  { emoji: '👉', category: 'smileys', keywords: ['right', 'kanan', 'tunjuk'] },
  { emoji: '👆', category: 'smileys', keywords: ['up', 'atas'] },
  { emoji: '👇', category: 'smileys', keywords: ['down', 'bawah'] },
  { emoji: '☝️', category: 'smileys', keywords: ['index up', 'satu'] },
  { emoji: '👍', category: 'smileys', keywords: ['thumbs up', 'jempol', 'bagus', 'setuju', 'top'] },
  { emoji: '👎', category: 'smileys', keywords: ['thumbs down', 'jelek', 'kurang'] },
  { emoji: '✊', category: 'smileys', keywords: ['fist', 'semangat', 'tinju'] },
  { emoji: '👊', category: 'smileys', keywords: ['punch', 'tinju', 'tos'] },
  { emoji: '🤛', category: 'smileys', keywords: ['left fist'] },
  { emoji: '🤜', category: 'smileys', keywords: ['right fist'] },
  { emoji: '👏', category: 'smileys', keywords: ['clap', 'tepuk tangan', 'applause', 'selamat'] },
  { emoji: '🙌', category: 'smileys', keywords: ['raising hands', 'hore', 'syukur'] },
  { emoji: '👐', category: 'smileys', keywords: ['open hands'] },
  { emoji: '🤲', category: 'smileys', keywords: ['palms up', 'doa', 'berdoa'] },
  { emoji: '🤝', category: 'smileys', keywords: ['handshake', 'salaman', 'deal', 'sepakat'] },
  { emoji: '🙏', category: 'smileys', keywords: ['pray', 'tolong', 'terima kasih', 'mohon', 'makasih', 'maaf'] },
  { emoji: '💪', category: 'smileys', keywords: ['muscle', 'kuat', 'semangat', 'otot'] },

  // Animals & Nature
  { emoji: '🐶', category: 'animals', keywords: ['dog', 'anjing', 'puppy'] },
  { emoji: '🐱', category: 'animals', keywords: ['cat', 'kucing', 'meow'] },
  { emoji: '🐭', category: 'animals', keywords: ['mouse', 'tikus'] },
  { emoji: '🐹', category: 'animals', keywords: ['hamster'] },
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
  { emoji: '🦇', category: 'animals', keywords: ['bat', 'kelelawar'] },
  { emoji: '🐺', category: 'animals', keywords: ['wolf', 'serigala'] },
  { emoji: '🐗', category: 'animals', keywords: ['boar', 'babi hutan'] },
  { emoji: '🐴', category: 'animals', keywords: ['horse', 'kuda'] },
  { emoji: '🦄', category: 'animals', keywords: ['unicorn'] },
  { emoji: '🐝', category: 'animals', keywords: ['bee', 'lebah'] },
  { emoji: '🐛', category: 'animals', keywords: ['bug', 'ulat'] },
  { emoji: '🦋', category: 'animals', keywords: ['butterfly', 'kupu-kupu'] },
  { emoji: '🐌', category: 'animals', keywords: ['snail', 'siput'] },
  { emoji: '🌸', category: 'animals', keywords: ['flower', 'bunga', 'sakura'] },
  { emoji: '🌹', category: 'animals', keywords: ['rose', 'mawar'] },
  { emoji: '🌻', category: 'animals', keywords: ['sunflower', 'matahari'] },
  { emoji: '🌲', category: 'animals', keywords: ['tree', 'pohon', 'pinus'] },
  { emoji: '🌴', category: 'animals', keywords: ['palm tree', 'kelapa'] },
  { emoji: '🌈', category: 'animals', keywords: ['rainbow', 'pelangi'] },
  { emoji: '☀️', category: 'animals', keywords: ['sun', 'cerah', 'panas'] },
  { emoji: '⭐', category: 'animals', keywords: ['star', 'bintang'] },
  { emoji: '🌟', category: 'animals', keywords: ['glowing star', 'gemerlap'] },
  { emoji: '⚡', category: 'animals', keywords: ['lightning', 'petir', 'kilat'] },
  { emoji: '🔥', category: 'animals', keywords: ['fire', 'api', 'semangat', 'hot'] },
  { emoji: '💧', category: 'animals', keywords: ['droplet', 'air', 'tetes'] },
  { emoji: '🌊', category: 'animals', keywords: ['wave', 'ombak', 'laut'] },

  // Food & Drink
  { emoji: '🍎', category: 'food', keywords: ['apple', 'apel'] },
  { emoji: '🍌', category: 'food', keywords: ['banana', 'pisang'] },
  { emoji: '🍉', category: 'food', keywords: ['watermelon', 'semangka'] },
  { emoji: '🍇', category: 'food', keywords: ['grapes', 'anggur'] },
  { emoji: '🍓', category: 'food', keywords: ['strawberry', 'stroberi'] },
  { emoji: '🥑', category: 'food', keywords: ['avocado', 'alpukat'] },
  { emoji: '🥕', category: 'food', keywords: ['carrot', 'wortel'] },
  { emoji: '🌽', category: 'food', keywords: ['corn', 'jagung'] },
  { emoji: '🍕', category: 'food', keywords: ['pizza'] },
  { emoji: '🍔', category: 'food', keywords: ['burger', 'hamburger'] },
  { emoji: '🍟', category: 'food', keywords: ['fries', 'kentang goreng'] },
  { emoji: '🌭', category: 'food', keywords: ['hotdog'] },
  { emoji: '🍿', category: 'food', keywords: ['popcorn'] },
  { emoji: '🥪', category: 'food', keywords: ['sandwich'] },
  { emoji: '🌮', category: 'food', keywords: ['taco'] },
  { emoji: '🍜', category: 'food', keywords: ['ramen', 'mie', 'noodle'] },
  { emoji: '🍲', category: 'food', keywords: ['soup', 'sup', 'bakso'] },
  { emoji: '🍣', category: 'food', keywords: ['sushi'] },
  { emoji: '🍱', category: 'food', keywords: ['bento'] },
  { emoji: '🍦', category: 'food', keywords: ['ice cream', 'es krim'] },
  { emoji: '🎂', category: 'food', keywords: ['cake', 'kue', 'ultah'] },
  { emoji: '☕', category: 'food', keywords: ['coffee', 'kopi', 'ngopi', 'santai'] },
  { emoji: '🍵', category: 'food', keywords: ['tea', 'teh'] },
  { emoji: '🧋', category: 'food', keywords: ['boba', 'bubble tea'] },
  { emoji: '🥤', category: 'food', keywords: ['soda', 'minuman'] },
  { emoji: '🍺', category: 'food', keywords: ['beer', 'bir'] },

  // Activities
  { emoji: '⚽', category: 'activities', keywords: ['soccer', 'bola', 'sepak bola'] },
  { emoji: '🏀', category: 'activities', keywords: ['basketball', 'basket'] },
  { emoji: '🏈', category: 'activities', keywords: ['football'] },
  { emoji: '⚾', category: 'activities', keywords: ['baseball'] },
  { emoji: '🎾', category: 'activities', keywords: ['tennis'] },
  { emoji: '🏐', category: 'activities', keywords: ['volleyball', 'voli'] },
  { emoji: '🏸', category: 'activities', keywords: ['badminton', 'bulutangkis'] },
  { emoji: '🏓', category: 'activities', keywords: ['pingpong', 'tenis meja'] },
  { emoji: '🥊', category: 'activities', keywords: ['boxing', 'tinju'] },
  { emoji: '🎮', category: 'activities', keywords: ['game', 'gaming', 'ps', 'stick'] },
  { emoji: '🎯', category: 'activities', keywords: ['target', 'dart', 'fokus'] },
  { emoji: '🎨', category: 'activities', keywords: ['art', 'seni', 'gambar', 'lukis'] },
  { emoji: '🎬', category: 'activities', keywords: ['movie', 'film', 'bioskop'] },
  { emoji: '🎤', category: 'activities', keywords: ['mic', 'karaoke', 'nyanyi'] },
  { emoji: '🎧', category: 'activities', keywords: ['headphones', 'musik', 'dengar'] },

  // Travel & Places
  { emoji: '🚗', category: 'travel', keywords: ['car', 'mobil'] },
  { emoji: '🚕', category: 'travel', keywords: ['taxi', 'taksi'] },
  { emoji: '🚙', category: 'travel', keywords: ['suv'] },
  { emoji: '🚌', category: 'travel', keywords: ['bus', 'bis'] },
  { emoji: '🚎', category: 'travel', keywords: ['trolleybus'] },
  { emoji: '🏎️', category: 'travel', keywords: ['racecar', 'f1'] },
  { emoji: '🚓', category: 'travel', keywords: ['police', 'polisi'] },
  { emoji: '🚑', category: 'travel', keywords: ['ambulance', 'ambulans'] },
  { emoji: '🚒', category: 'travel', keywords: ['firetruck', 'damkar'] },
  { emoji: '🚐', category: 'travel', keywords: ['van'] },
  { emoji: '🚚', category: 'travel', keywords: ['truck', 'truk'] },
  { emoji: '🛵', category: 'travel', keywords: ['scooter', 'motor', 'ojol', 'vespa', 'otw'] },
  { emoji: '🏍️', category: 'travel', keywords: ['motorcycle', 'moge'] },
  { emoji: '🚲', category: 'travel', keywords: ['bike', 'sepeda'] },
  { emoji: '✈️', category: 'travel', keywords: ['airplane', 'pesawat', 'terbang'] },
  { emoji: '🚀', category: 'travel', keywords: ['rocket', 'roket', 'cepat', 'meluncur'] },
  { emoji: '🛸', category: 'travel', keywords: ['ufo'] },
  { emoji: '🚁', category: 'travel', keywords: ['helicopter', 'helikopter'] },
  { emoji: '🚂', category: 'travel', keywords: ['train', 'kereta'] },
  { emoji: '🏠', category: 'travel', keywords: ['house', 'rumah', 'home'] },
  { emoji: '🏢', category: 'travel', keywords: ['office', 'kantor', 'gedung'] },

  // Objects
  { emoji: '💡', category: 'objects', keywords: ['lightbulb', 'lampu', 'ide'] },
  { emoji: '🔦', category: 'objects', keywords: ['flashlight', 'senter'] },
  { emoji: '📱', category: 'objects', keywords: ['phone', 'hp', 'smartphone'] },
  { emoji: '💻', category: 'objects', keywords: ['laptop', 'komputer'] },
  { emoji: '🖥️', category: 'objects', keywords: ['desktop', 'pc'] },
  { emoji: '📷', category: 'objects', keywords: ['camera', 'kamera', 'foto', 'digicam'] },
  { emoji: '📸', category: 'objects', keywords: ['camera flash', 'foto', 'digicam'] },
  { emoji: '📹', category: 'objects', keywords: ['video camera', 'video'] },
  { emoji: '📦', category: 'objects', keywords: ['package', 'paket', 'box', 'kirim'] },
  { emoji: '🔑', category: 'objects', keywords: ['key', 'kunci'] },
  { emoji: '🎁', category: 'objects', keywords: ['gift', 'kado', 'hadiah'] },
  { emoji: '💰', category: 'objects', keywords: ['money bag', 'uang', 'cuan'] },
  { emoji: '💵', category: 'objects', keywords: ['dollar', 'rupiah', 'duit'] },
  { emoji: '💳', category: 'objects', keywords: ['credit card', 'kartu', 'transfer', 'bayar'] },
  { emoji: '📄', category: 'objects', keywords: ['document', 'surat', 'dokumen', 'ktp'] },
  { emoji: '📌', category: 'objects', keywords: ['pushpin', 'pin', 'sematkan'] },
  { emoji: '📍', category: 'objects', keywords: ['pin', 'lokasi', 'alamat', 'map'] },

  // Symbols
  { emoji: '❤️', category: 'symbols', keywords: ['red heart', 'hati', 'cinta', 'love'] },
  { emoji: '🧡', category: 'symbols', keywords: ['orange heart'] },
  { emoji: '💛', category: 'symbols', keywords: ['yellow heart'] },
  { emoji: '💚', category: 'symbols', keywords: ['green heart'] },
  { emoji: '💙', category: 'symbols', keywords: ['blue heart'] },
  { emoji: '💜', category: 'symbols', keywords: ['purple heart'] },
  { emoji: '🖤', category: 'symbols', keywords: ['black heart'] },
  { emoji: '🤍', category: 'symbols', keywords: ['white heart'] },
  { emoji: '🤎', category: 'symbols', keywords: ['brown heart'] },
  { emoji: '💔', category: 'symbols', keywords: ['broken heart', 'patah hati'] },
  { emoji: '💖', category: 'symbols', keywords: ['sparkling heart', 'cinta'] },
  { emoji: '💗', category: 'symbols', keywords: ['growing heart'] },
  { emoji: '💓', category: 'symbols', keywords: ['beating heart'] },
  { emoji: '💞', category: 'symbols', keywords: ['revolving hearts'] },
  { emoji: '💕', category: 'symbols', keywords: ['two hearts'] },
  { emoji: '✨', category: 'symbols', keywords: ['sparkles', 'kilau', 'bintang'] },
  { emoji: '💯', category: 'symbols', keywords: ['100', 'sempurna', 'pas'] },
  { emoji: '✅', category: 'symbols', keywords: ['check', 'centang', 'benar', 'lunas', 'selesai', 'ok'] },
  { emoji: '❌', category: 'symbols', keywords: ['cross', 'salah', 'batal'] },
  { emoji: '⚠️', category: 'symbols', keywords: ['warning', 'peringatan', 'hati-hati'] },
  { emoji: '❓', category: 'symbols', keywords: ['question', 'tanya', 'bingung'] },
  { emoji: '❗', category: 'symbols', keywords: ['exclamation', 'seru', 'penting'] },

  // Flags
  { emoji: '🇮🇩', category: 'flags', keywords: ['indonesia', 'merah putih', 'id'] },
  { emoji: '🇲🇾', category: 'flags', keywords: ['malaysia'] },
  { emoji: '🇸🇬', category: 'flags', keywords: ['singapore'] },
  { emoji: '🇯🇵', category: 'flags', keywords: ['japan', 'jepang'] },
  { emoji: '🇰🇷', category: 'flags', keywords: ['korea'] },
  { emoji: '🇺🇸', category: 'flags', keywords: ['usa', 'amerika'] },
  { emoji: '🇬🇧', category: 'flags', keywords: ['uk', 'inggris'] },
];

// ── WhatsApp Sticker Categories (Matching Image #1) ───────────────────────────
export type StickerCategory =
  | 'recent'
  | 'favorites'
  | 'love'
  | 'reactions'
  | 'smileys'
  | 'sad'
  | 'angry'
  | 'objects';

interface StickerCategoryTab {
  id: StickerCategory;
  title: string;
  icon: React.ReactNode;
}

const STICKER_CATEGORIES: StickerCategoryTab[] = [
  { id: 'recent', title: 'Terakhir digunakan', icon: <Clock size={19} /> },
  { id: 'favorites', title: 'Favorit', icon: <Star size={19} /> },
  { id: 'love', title: 'Cinta & Sayang', icon: <Heart size={19} /> },
  { id: 'reactions', title: 'Reaksi & Jempol', icon: <ThumbsUp size={19} /> },
  { id: 'smileys', title: 'Lucu & Tertawa', icon: <Smile size={19} /> },
  { id: 'sad', title: 'Sedih & Bingung', icon: <Frown size={19} /> },
  { id: 'angry', title: 'Marah & Semangat', icon: <Flame size={19} /> },
  { id: 'objects', title: 'Santai & Ngopi', icon: <Coffee size={19} /> },
];

// ── WhatsApp Native Stickers (Matching Image #1 Meme & Business Set) ─────────
export interface PresetSticker {
  id: string;
  title: string;
  category: StickerCategory;
  caption: string;
  subtext?: string;
  bgGradient: [string, string];
  emoji: string;
  badgeTag?: string;
}

const PRESET_STICKERS: PresetSticker[] = [
  // Reactions & Memes from Image #1
  {
    id: 'stk_patrick',
    title: 'Patrick Ngambek',
    category: 'reactions',
    caption: 'HMPH! 😤',
    subtext: 'Gak mau tau',
    bgGradient: ['#f43f5e', '#fb7185'],
    emoji: '⭐',
    badgeTag: 'PATRICK',
  },
  {
    id: 'stk_boloku',
    title: 'Boloku Ngakak',
    category: 'smileys',
    caption: 'BOLOKU 🤣',
    subtext: 'Wkwkwk mantap',
    bgGradient: ['#f59e0b', '#d97706'],
    emoji: '🧔',
    badgeTag: 'BOLOKU',
  },
  {
    id: 'stk_jempol',
    title: 'Jempol Mantap',
    category: 'reactions',
    caption: 'MANTAPP! 👍',
    subtext: 'Bagus banget',
    bgGradient: ['#0284c7', '#0369a1'],
    emoji: '👍',
    badgeTag: 'TOP',
  },
  {
    id: 'stk_siapp',
    title: 'Siappp Shouting',
    category: 'reactions',
    caption: 'SIAPPP! 📢',
    subtext: 'Meluncur segera',
    bgGradient: ['#e11d48', '#be123c'],
    emoji: '🗣️',
    badgeTag: 'SIAPP',
  },
  {
    id: 'stk_kumendan',
    title: 'Siap Kumendan',
    category: 'reactions',
    caption: 'SIAP KUMENDAN',
    subtext: 'Laksanakan tugas',
    bgGradient: ['#16a34a', '#15803d'],
    emoji: '🪖',
    badgeTag: 'KUMENDAN',
  },
  {
    id: 'stk_love_hand',
    title: 'Heart Hand Gesture',
    category: 'love',
    caption: 'SARANGHAE 💖',
    subtext: 'Buat kamu kak',
    bgGradient: ['#0ea5e9', '#0284c7'],
    emoji: '🫶',
    badgeTag: 'LOVE',
  },
  {
    id: 'stk_cium',
    title: 'Cium Sayang',
    category: 'love',
    caption: 'MUACHHH 😘',
    subtext: 'Makasih banyak',
    bgGradient: ['#ec4899', '#db2777'],
    emoji: '💋',
    badgeTag: 'KISS',
  },
  {
    id: 'stk_senyum_adem',
    title: 'Senyum Bahagia',
    category: 'smileys',
    caption: 'SENYUM DULU 😊',
    subtext: 'Damai sentosa',
    bgGradient: ['#38bdf8', '#0284c7'],
    emoji: '😇',
    badgeTag: 'ADEM',
  },
  {
    id: 'stk_walowee',
    title: 'Kucing Walowee',
    category: 'smileys',
    caption: 'WALAWEE 😸',
    subtext: 'Aseeek banget',
    bgGradient: ['#fb923c', '#ea580c'],
    emoji: '🐱',
    badgeTag: 'WALAWEE',
  },
  {
    id: 'stk_gass',
    title: 'Gasss Kumendan',
    category: 'angry',
    caption: 'GASSS! 🔥',
    subtext: 'Tanpa rem kak',
    bgGradient: ['#dc2626', '#b91c1c'],
    emoji: '🚀',
    badgeTag: 'GASS',
  },
  {
    id: 'stk_lelah',
    title: 'Lelah Banget',
    category: 'sad',
    caption: 'LELAH 😭',
    subtext: 'Rehat bentar kak',
    bgGradient: ['#475569', '#334155'],
    emoji: '🛌',
    badgeTag: 'LELAH',
  },
  {
    id: 'stk_baby_gemoy',
    title: 'Bayi Gemoy',
    category: 'love',
    caption: 'GEMOY BANGET 🥰',
    subtext: 'Lucu pol',
    bgGradient: ['#f472b6', '#ec4899'],
    emoji: '👶',
    badgeTag: 'GEMOY',
  },

  // Rental & Business Greetings
  {
    id: 'stk_siap_kak',
    title: 'Siappp Kak',
    category: 'reactions',
    caption: 'SIAPPP KAK 🙏',
    subtext: 'Segera diproses ya',
    bgGradient: ['#059669', '#047857'],
    emoji: '🙏',
    badgeTag: 'SEGERA',
  },
  {
    id: 'stk_otw_kak',
    title: 'OTW Kak',
    category: 'objects',
    caption: 'OTW KAK 🛵',
    subtext: 'Sedang perjalanan',
    bgGradient: ['#22c55e', '#16a34a'],
    emoji: '🛵',
    badgeTag: 'OTW',
  },
  {
    id: 'stk_cek_foto',
    title: 'Cek Foto Gdrive',
    category: 'objects',
    caption: 'CEK FOTO KAK 📸',
    subtext: 'Link gdrive sudah siap',
    bgGradient: ['#8b5cf6', '#7c3aed'],
    emoji: '📸',
    badgeTag: 'GDRIVE',
  },
  {
    id: 'stk_lunas',
    title: 'Sudah Lunas',
    category: 'reactions',
    caption: 'LUNAS YA KAK ✅',
    subtext: 'Terima kasih banyak',
    bgGradient: ['#10b981', '#059669'],
    emoji: '✅',
    badgeTag: 'LUNAS',
  },
  {
    id: 'stk_santuy',
    title: 'Santuy Dulu',
    category: 'objects',
    caption: 'SANTUY DULU ☕',
    subtext: 'Aman terkendali',
    bgGradient: ['#0ea5e9', '#0284c7'],
    emoji: '☕',
    badgeTag: 'SANTUY',
  },
  {
    id: 'stk_terharu',
    title: 'Terharu Makasih',
    category: 'love',
    caption: 'MAKASIH BANYAK 🐰',
    subtext: 'Bintang 5 buat kakak',
    bgGradient: ['#f43f5e', '#e11d48'],
    emoji: '💖',
    badgeTag: 'MAKASIH',
  },
];

/**
 * Generate 512x512 crisp WebP WhatsApp sticker with die-cut white outline
 */
async function generateStickerBase64(sticker: PresetSticker): Promise<{ base64: string; mimetype: string }> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve({ base64: '', mimetype: 'image/webp' });
      return;
    }

    ctx.clearRect(0, 0, 512, 512);
    // Die-cut rounded card with WhatsApp sticker proportions
    const r = 52;
    const x0 = 36;
    const y0 = 36;
    const w = 440;
    const h = 440;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0 + r, y0);
    ctx.lineTo(x0 + w - r, y0);
    ctx.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
    ctx.lineTo(x0 + w, y0 + h - r);
    ctx.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
    ctx.lineTo(x0 + r, y0 + h);
    ctx.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
    ctx.lineTo(x0, y0 + r);
    ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
    ctx.closePath();

    // Vibrant background gradient
    const grad = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
    grad.addColorStop(0, sticker.bgGradient[0]);
    grad.addColorStop(1, sticker.bgGradient[1]);
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fill();

    // Die-cut white stroke
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();

    // Decorative top badge tag
    if (sticker.badgeTag) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      ctx.roundRect(180, 58, 152, 34, 17);
      ctx.fill();
      ctx.font = 'bold 20px "Segoe UI", -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.badgeTag, 256, 75);
      ctx.restore();
    }

    // Main big emoji / icon
    ctx.save();
    ctx.font = '148px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sticker.emoji, 256, 210);
    ctx.restore();

    // Main bold sticker caption
    ctx.save();
    ctx.font = '900 38px "Segoe UI", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillText(sticker.caption, 256, 350);
    ctx.restore();

    // Subtext
    if (sticker.subtext) {
      ctx.save();
      ctx.font = '600 24px "Segoe UI", -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fillText(sticker.subtext, 256, 400);
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/webp', 0.92);
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    resolve({ base64, mimetype: 'image/webp' });
  });
}

/**
 * Convert user uploaded image to 512x512 WebP WhatsApp sticker
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

        const maxDim = 488;
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

// ── Main EmojiStickerPicker Component ─────────────────────────────────────────
export function EmojiStickerPicker({
  onSelectEmoji,
  onSendSticker,
  onClose,
  disabled = false,
  triggerRef,
}: EmojiStickerPickerProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollBodyRef = useRef<HTMLDivElement | null>(null);

  // Bottom segmented tabs: 'emoji' | 'gif' | 'sticker' (Defaults to emoji matching Image #1)
  const [activeTab, setActiveTab] = useState<'emoji' | 'gif' | 'sticker'>('emoji');

  // Top category tabs
  const [activeStickerCategory, setActiveStickerCategory] = useState<StickerCategory>('recent');
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<EmojiItem['category']>('recent');

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sending state
  const [isSendingSticker, setIsSendingSticker] = useState<boolean>(false);

  // Recent emojis
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('openwa_recent_emojis');
      return stored ? JSON.parse(stored) : ['😀', '😂', '👍', '❤️', '🔥', '🙏', '✨', '📸'];
    } catch {
      return ['😀', '😂', '👍', '❤️', '🔥', '🙏'];
    }
  });

  // Recent stickers
  const [recentStickerIds, setRecentStickerIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('openwa_recent_stickers');
      return stored
        ? JSON.parse(stored)
        : ['stk_patrick', 'stk_boloku', 'stk_jempol', 'stk_siapp', 'stk_kumendan', 'stk_love_hand', 'stk_walowee', 'stk_siap_kak'];
    } catch {
      return ['stk_patrick', 'stk_boloku', 'stk_jempol', 'stk_siapp'];
    }
  });

  const customFileInputRef = useRef<HTMLInputElement | null>(null);

  // Outside click & escape listener
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        popupRef.current &&
        !popupRef.current.contains(target) &&
        (!triggerRef?.current || !triggerRef.current.contains(target))
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [onClose, triggerRef]);

  // Handle emoji pick
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
  const scrollToEmojiCategory = (catId: EmojiItem['category']) => {
    setActiveEmojiCategory(catId);
    setSearchQuery('');
    const target = sectionRefs.current[catId];
    if (target && scrollBodyRef.current) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScroll = () => {
    if (searchQuery || activeTab !== 'emoji') return;
    const container = scrollBodyRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;

    for (const cat of EMOJI_CATEGORIES) {
      const el = sectionRefs.current[cat.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top - containerTop <= 80 && rect.bottom - containerTop > 20) {
        setActiveEmojiCategory(cat.id);
        break;
      }
    }
  };

  // Handle preset sticker pick
  const handlePresetStickerClick = async (sticker: PresetSticker) => {
    if (disabled || isSendingSticker) return;
    try {
      setIsSendingSticker(true);
      const { base64, mimetype } = await generateStickerBase64(sticker);
      if (base64) {
        await onSendSticker(base64, mimetype);
        setRecentStickerIds(prev => {
          const updated = [sticker.id, ...prev.filter(id => id !== sticker.id)].slice(0, 24);
          try {
            localStorage.setItem('openwa_recent_stickers', JSON.stringify(updated));
          } catch {
            /* ignore */
          }
          return updated;
        });
      }
    } finally {
      setIsSendingSticker(false);
    }
  };

  // Handle custom sticker file upload
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

  // Filtered Emojis
  const displayedEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return RAW_EMOJIS.filter(
        item => item.emoji.includes(q) || item.keywords.some(k => k.toLowerCase().includes(q))
      ).map(item => item.emoji);
    }

    if (activeEmojiCategory === 'recent') {
      return recentEmojis;
    }

    return RAW_EMOJIS.filter(item => item.category === activeEmojiCategory).map(item => item.emoji);
  }, [searchQuery, activeEmojiCategory, recentEmojis]);

  // Filtered Stickers
  const displayedStickers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return PRESET_STICKERS.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.caption.toLowerCase().includes(q) ||
          (s.subtext && s.subtext.toLowerCase().includes(q)) ||
          (s.badgeTag && s.badgeTag.toLowerCase().includes(q))
      );
    }

    if (activeStickerCategory === 'recent') {
      const recentList = recentStickerIds
        .map(id => PRESET_STICKERS.find(s => s.id === id))
        .filter((s): s is PresetSticker => Boolean(s));
      return recentList.length > 0 ? recentList : PRESET_STICKERS;
    }

    if (activeStickerCategory === 'favorites') {
      return PRESET_STICKERS.slice(0, 8);
    }

    return PRESET_STICKERS.filter(s => s.category === activeStickerCategory);
  }, [searchQuery, activeStickerCategory, recentStickerIds]);

  return (
    <div ref={popupRef} className="wa-picker-popup chats-emoji-picker">
      {/* ── 1. TOP CATEGORY ROW (Clock, Star, Heart, etc. with active underline) ── */}
      <div className="wa-picker-categories-row">
        {activeTab === 'sticker' ? (
          <>
            {STICKER_CATEGORIES.map(cat => {
              const isActive = activeStickerCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`wa-cat-btn ${isActive ? 'active' : ''}`}
                  title={cat.title}
                  onClick={() => {
                    setActiveStickerCategory(cat.id);
                    setSearchQuery('');
                  }}
                >
                  {cat.icon}
                </button>
              );
            })}
            <button
              type="button"
              className="wa-cat-btn wa-cat-btn-add"
              title="Tambah / Upload Stiker Baru"
              onClick={() => customFileInputRef.current?.click()}
            >
              <Plus size={20} strokeWidth={2.4} />
            </button>
          </>
        ) : activeTab === 'emoji' ? (
          EMOJI_CATEGORIES.map(cat => {
            const isActive = activeEmojiCategory === cat.id && !searchQuery;
            return (
              <button
                key={cat.id}
                type="button"
                className={`wa-cat-btn ${isActive ? 'active' : ''}`}
                title={cat.label}
                onClick={() => scrollToEmojiCategory(cat.id)}
              >
                {cat.icon}
              </button>
            );
          })
        ) : (
          <div className="wa-gif-categories-bar">
            <span className="wa-gif-chip-active">🔥 Trending GIFs</span>
            <span className="wa-gif-chip">🤣 Reaksi</span>
            <span className="wa-gif-chip">👏 Tepuk Tangan</span>
            <span className="wa-gif-chip">💖 Cinta</span>
          </div>
        )}
      </div>

      {/* ── 2. SEARCH BAR (WhatsApp Pill with Green Border - Image #1) ───────── */}
      <div className="wa-picker-search-container">
        <div className="wa-picker-search-pill">
          <Search size={17} className="wa-picker-search-icon" />
          <input
            type="text"
            placeholder={
              activeTab === 'sticker'
                ? 'Search via WhatsApp sticker store'
                : activeTab === 'emoji'
                ? 'Search emoji'
                : 'Search via Tenor / GIPHY'
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="wa-picker-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="wa-picker-search-clear-btn"
              title="Hapus pencarian"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── 3. MIDDLE SCROLLABLE BODY ────────────────────────────────────────── */}
      <div ref={scrollBodyRef} onScroll={handleScroll} className="wa-picker-scroll-body">
        {/* Hidden file input for custom stickers */}
        <input
          type="file"
          ref={customFileInputRef}
          accept="image/*,.webp"
          style={{ display: 'none' }}
          onChange={handleCustomStickerUpload}
        />

        {activeTab === 'sticker' ? (
          /* ── STICKER 4-COLUMN GRID (Matching Image #1) ── */
          <div className="wa-sticker-grid">
            {/* Tile 1: "+ Create" Card */}
            {!searchQuery && (
              <button
                type="button"
                className="wa-sticker-create-tile"
                onClick={() => customFileInputRef.current?.click()}
                disabled={disabled || isSendingSticker}
                title="Buat stiker dari foto Anda"
              >
                <div className="wa-create-circle-icon">
                  <Plus size={20} strokeWidth={2.4} />
                </div>
                <span className="wa-create-tile-text">Create</span>
              </button>
            )}

            {/* Sticker Items */}
            {displayedStickers.map(stk => (
              <button
                key={stk.id}
                type="button"
                className="wa-sticker-item-btn"
                onClick={() => handlePresetStickerClick(stk)}
                disabled={disabled || isSendingSticker}
                title={`Kirim: ${stk.title}`}
              >
                <div
                  className="wa-sticker-visual-card"
                  style={{
                    background: `linear-gradient(135deg, ${stk.bgGradient[0]} 0%, ${stk.bgGradient[1]} 100%)`,
                  }}
                >
                  <span className="wa-stk-emoji-art">{stk.emoji}</span>
                  <span className="wa-stk-caption-art">{stk.caption}</span>
                </div>
              </button>
            ))}

            {isSendingSticker && (
              <div className="wa-sticker-sending-toast">
                <Loader2 size={16} className="animate-spin" />
                <span>Mengirim stiker WhatsApp…</span>
              </div>
            )}
          </div>
        ) : activeTab === 'emoji' ? (
          <div className="wa-emoji-scroll-content">
            {searchQuery ? (
              displayedEmojis.length > 0 ? (
                <div className="wa-emoji-grid">
                  {displayedEmojis.map((emoji, idx) => (
                    <button
                      key={`search_${emoji}_${idx}`}
                      type="button"
                      className="wa-emoji-btn"
                      onClick={() => handleEmojiClick(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="wa-picker-empty-state">No emoji found</div>
              )
            ) : (
              <>
                {recentEmojis.length > 0 && (
                  <div
                    key="recent"
                    ref={el => {
                      sectionRefs.current['recent'] = el;
                    }}
                    className="wa-emoji-section"
                  >
                    <div className="wa-emoji-section-title">Recent</div>
                    <div className="wa-emoji-grid">
                      {recentEmojis.map((emoji, idx) => (
                        <button
                          key={`recent_${emoji}_${idx}`}
                          type="button"
                          className="wa-emoji-btn"
                          onClick={() => handleEmojiClick(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {EMOJI_CATEGORIES.filter(cat => cat.id !== 'recent').map(cat => {
                  const catEmojis = RAW_EMOJIS.filter(e => e.category === cat.id);
                  if (catEmojis.length === 0) return null;
                  return (
                    <div
                      key={cat.id}
                      ref={el => {
                        sectionRefs.current[cat.id] = el;
                      }}
                      className="wa-emoji-section"
                    >
                      <div className="wa-emoji-section-title">{cat.label}</div>
                      <div className="wa-emoji-grid">
                        {catEmojis.map((item, idx) => (
                          <button
                            key={`${cat.id}_${item.emoji}_${idx}`}
                            type="button"
                            className="wa-emoji-btn"
                            onClick={() => handleEmojiClick(item.emoji)}
                          >
                            {item.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        ) : (
          <div className="wa-gif-grid">
            <div className="wa-gif-placeholder-card">
              <Sparkles size={28} className="text-emerald-500 mb-2" />
              <span className="font-semibold text-sm">GIPHY & Tenor Integration</span>
              <span className="text-xs text-muted-foreground text-center mt-1 px-4">
                Pilih stiker WhatsApp di tab kanan untuk stiker langsung!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. BOTTOM FLOATING PILL SWITCHER ([😊] [GIF] [🏷️] - Image #1) ────── */}
      <div className="wa-picker-bottom-bar">
        <div className="wa-picker-bottom-pill">
          {/* 1. Emoji Tab */}
          <button
            type="button"
            className={`wa-bottom-tab-btn ${activeTab === 'emoji' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('emoji');
              setSearchQuery('');
            }}
            title="Emoji"
          >
            <Smile size={21} strokeWidth={2.2} />
          </button>

          {/* 2. GIF Tab */}
          <button
            type="button"
            className={`wa-bottom-tab-btn ${activeTab === 'gif' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('gif');
              setSearchQuery('');
            }}
            title="GIF"
          >
            <span className="wa-gif-text">GIF</span>
          </button>

          {/* 3. Sticker Tab (WhatsApp Folded Corner Sticker) */}
          <button
            type="button"
            className={`wa-bottom-tab-btn ${activeTab === 'sticker' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('sticker');
              setSearchQuery('');
            }}
            title="Stiker"
          >
            <WAStickerFoldedIcon size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmojiStickerPicker;
