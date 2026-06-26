export interface CivicBadge {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export interface CivicProfile {
  points: number;
  level: string;
  badges: CivicBadge[];
  reportsCount: number;
  verificationsCount: number;
  potholeReportsCount: number;
  environmentalReportsCount: number;
}

export interface LeaderboardUser {
  name: string;
  points: number;
  level: string;
  badgesCount: number;
  isCurrentUser?: boolean;
}

export const ALL_BADGES: Record<string, CivicBadge> = {
  pothole_patrol: {
    id: 'pothole_patrol',
    name: 'Pothole Patrol',
    description: 'Reported 5 or more potholes',
    emoji: '🕳️🏆'
  },
  eagle_eye: {
    id: 'eagle_eye',
    name: 'Eagle Eye',
    description: 'Verified 10 or more reports',
    emoji: '🦅👁️'
  },
  green_guardian: {
    id: 'green_guardian',
    name: 'Green Guardian',
    description: 'Reported environmental or drainage concerns',
    emoji: '💧🌱'
  }
};

const DEFAULT_PROFILE: CivicProfile = {
  points: 120, // Give them a head start for a better UX!
  level: 'Concerned Resident',
  badges: [],
  reportsCount: 2,
  verificationsCount: 4,
  potholeReportsCount: 2,
  environmentalReportsCount: 0
};

export function getLevel(points: number): string {
  if (points >= 600) return 'Community Guardian';
  if (points >= 250) return 'Civic Champion';
  return 'Concerned Resident';
}

export function getUserCivicProfile(): CivicProfile {
  const data = localStorage.getItem('urbanpulse_civic_profile');
  if (!data) {
    localStorage.setItem('urbanpulse_civic_profile', JSON.stringify(DEFAULT_PROFILE));
    return DEFAULT_PROFILE;
  }
  try {
    const profile = JSON.parse(data) as CivicProfile;
    // Calculate level and badges dynamically
    profile.level = getLevel(profile.points);
    
    const badges: CivicBadge[] = [];
    if (profile.potholeReportsCount >= 5) {
      badges.push(ALL_BADGES.pothole_patrol);
    }
    if (profile.verificationsCount >= 10) {
      badges.push(ALL_BADGES.eagle_eye);
    }
    if (profile.environmentalReportsCount >= 1) {
      badges.push(ALL_BADGES.green_guardian);
    }
    profile.badges = badges;
    
    return profile;
  } catch (e) {
    return DEFAULT_PROFILE;
  }
}

export function updateUserCivicProfile(profile: CivicProfile): void {
  localStorage.setItem('urbanpulse_civic_profile', JSON.stringify(profile));
}

export function awardPoints(amount: number, reason: string): CivicProfile {
  const profile = getUserCivicProfile();
  profile.points += amount;
  profile.level = getLevel(profile.points);
  updateUserCivicProfile(profile);
  
  // Show a visual toast if in window context
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('profile-updated'));
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 z-[9999] bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold px-4 py-3 rounded-xl shadow-2xl border border-amber-400 flex flex-col gap-0.5 animate-bounce';
    toast.innerHTML = `
      <div class="text-[10px] text-amber-100 uppercase tracking-widest font-black">Civic Karma Earned!</div>
      <div class="text-xs">+${amount} CKP: ${reason}</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }
  
  return profile;
}

export function logNewReport(isPothole: boolean, isEnvironmental: boolean): CivicProfile {
  const profile = getUserCivicProfile();
  profile.reportsCount += 1;
  if (isPothole) profile.potholeReportsCount += 1;
  if (isEnvironmental) profile.environmentalReportsCount += 1;
  updateUserCivicProfile(profile);
  return awardPoints(50, 'Filed an accurate hazard report');
}

export function logVerification(): CivicProfile {
  const profile = getUserCivicProfile();
  profile.verificationsCount += 1;
  updateUserCivicProfile(profile);
  return awardPoints(15, 'Verified a municipal report');
}

export function logResolutionEarned(): CivicProfile {
  return awardPoints(100, 'Issue resolved by consensus/municipal action');
}

// Top 5 heroes list
export function getLeaderboard(): LeaderboardUser[] {
  const user = getUserCivicProfile();
  
  const mockHeroes: LeaderboardUser[] = [
    { name: 'Amit Sharma (Bengaluru)', points: 720, level: 'Community Guardian', badgesCount: 3 },
    { name: 'Priya Patel (Ahmedabad)', points: 510, level: 'Civic Champion', badgesCount: 2 },
    { name: 'Rajesh Kumar (Chennai)', points: 380, level: 'Civic Champion', badgesCount: 1 },
    { name: 'Ananya Reddy (Hyderabad)', points: 260, level: 'Civic Champion', badgesCount: 1 }
  ];
  
  const currentUser: LeaderboardUser = {
    name: 'You (Citizen Agent)',
    points: user.points,
    level: user.level,
    badgesCount: user.badges.length,
    isCurrentUser: true
  };
  
  // Combine, sort, and slice to top 5
  const combined = [...mockHeroes, currentUser];
  combined.sort((a, b) => b.points - a.points);
  
  return combined.slice(0, 5);
}
