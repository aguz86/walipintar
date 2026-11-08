import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { AGE_LEVELS } from '../data/items';
import { SFX } from '../utils/audio';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'id' | 'en';
  name: string;
  onSetName: (name: string) => void;
  age: number;
  onSetAge: (age: number) => void;
  avatar: string;
  onSetAvatar: (avatar: string) => void;
  level: number;
  onSetLevel: (level: number) => void;
}

const AVATARS = ['👦', '👧', '🧒', '🐱', '🐶', '🦁', '🐼', '🌻'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  lang,
  name,
  onSetName,
  age,
  onSetAge,
  avatar,
  onSetAvatar,
  level,
  onSetLevel,
}) => {
  const [localName, setLocalName] = useState(name);

  if (!isOpen) return null;

  const handleAgeSelect = (a: number) => {
    onSetAge(a);
    // Auto map age to level: 3-4 -> 0 (Si Kecil), 5-6 -> 1 (Pintar), 7-8 -> 2 (Juara)
    const recLevel = a <= 4 ? 0 : a <= 6 ? 1 : 2;
    onSetLevel(recLevel);
    SFX.bloop();
  };

  const handleSave = () => {
    onSetName(localName.trim().slice(0, 14));
    SFX.ding();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white p-4 sm:p-6 shadow-2xl relative border-4 border-indigo-200 my-auto text-slate-800 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-5">
          <div className="text-5xl mb-2 inline-block p-3 rounded-full bg-indigo-50 border-2 border-indigo-100 shadow-sm">
            {avatar}
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {lang === 'id' ? 'Profil Si Kecil' : 'Child Profile'}
          </h3>
          <p className="text-xs text-slate-500">
            {lang === 'id' ? 'Sesuaikan nama, usia, dan tingkat kesulitan' : 'Customize name, age, and difficulty'}
          </p>
        </div>

        <div className="space-y-4">
          {/* Name input */}
          <div>
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">
              {lang === 'id' ? 'Nama Kamu' : 'Your Name'}
            </label>
            <input
              type="text"
              maxLength={14}
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder={lang === 'id' ? 'Tulis nama kamu...' : 'Enter your name...'}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 text-lg font-black text-slate-800 focus:outline-none"
            />
          </div>

          {/* Age Selection */}
          <div>
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">
              {lang === 'id' ? 'Umur Berapa Tahun?' : 'How Old Are You?'}
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[3, 4, 5, 6, 7, 8].map((a) => (
                <button
                  key={a}
                  onClick={() => handleAgeSelect(a)}
                  className={`h-12 rounded-2xl font-black text-lg transition-all cursor-pointer ${
                    age === a
                      ? 'bg-indigo-600 text-white shadow-md scale-105'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Selection */}
          <div>
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">
              {lang === 'id' ? 'Pilih Karakter Favorit' : 'Favorite Avatar'}
            </label>
            <div className="flex gap-2 justify-center flex-wrap">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  onClick={() => {
                    onSetAvatar(av);
                    SFX.bloop();
                  }}
                  className={`w-11 h-11 text-2xl rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    avatar === av
                      ? 'bg-amber-300 ring-4 ring-amber-400/50 scale-110 shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Level Tier Selection */}
          <div>
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">
              {lang === 'id' ? 'Tingkat Kesulitan' : 'Difficulty Tier'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {AGE_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => {
                    onSetLevel(lvl.id);
                    SFX.bloop();
                  }}
                  className={`p-2.5 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                    level === lvl.id
                      ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-xl mb-0.5">{lvl.badge}</div>
                  <div className="text-xs font-black text-slate-900 leading-tight">
                    {lang === 'id' ? lvl.nameId : lvl.nameEn}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">{lvl.ageRange}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
              {lang === 'id' ? AGE_LEVELS[level].descId : AGE_LEVELS[level].descEn}
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full mt-3 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base shadow-lg transition-all active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            <span>{lang === 'id' ? 'Simpan & Main' : 'Save & Play'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
