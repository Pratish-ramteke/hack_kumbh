// Tailwind CSS (Play CDN) theme config — must load right after the Tailwind CDN script
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        medDark: '#25292E',
        medBg: '#F4F6F9',
        medCard: '#FFFFFF',
        medBubble: '#F6F7F9',
        medTeal: '#8CE2E0',
        medCyan: '#3AC8F0',
        medMint: '#5BE2B5',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(24, 39, 75, 0.04)',
        glowCyan: '0 8px 20px -4px rgba(58, 200, 240, 0.42)',
        glowPromo: '0 10px 24px -6px rgba(45, 165, 245, 0.45)',
      },
    },
  },
};
