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
  displayName?: string;
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
  points: 120,
  level: 'Concerned Resident',
  badges: [],
  reportsCount: 2,
  verificationsCount: 4,
  potholeReportsCount: 2,
  environmentalReportsCount: 0
};

export function getActiveUserId(): string {
  return localStorage.getItem('urbanpulse_current_user_id') || 'anonymous';
}

export function getActiveUserEmail(): string {
  return localStorage.getItem('urbanpulse_current_user_email') || 'anonymous@gmail.com';
}

export function getLevel(points: number): string {
  if (points >= 600) return 'Community Guardian';
  if (points >= 250) return 'Civic Champion';
  return 'Concerned Resident';
}

function updateSharedRegistry(userId: string, profile: CivicProfile) {
  try {
    const registryKey = 'urbanpulse_leaderboard_registry';
    const data = localStorage.getItem(registryKey);
    const registry = data ? JSON.parse(data) : {};
    
    registry[userId] = {
      name: profile.displayName || userId,
      points: profile.points,
      level: profile.level,
      badgesCount: profile.badges.length
    };
    
    localStorage.setItem(registryKey, JSON.stringify(registry));
  } catch (e) {
    console.error('Failed to update shared registry:', e);
  }
}

export function getUserCivicProfile(): CivicProfile {
  const userId = getActiveUserId();
  const key = `urbanpulse_civic_profile_${userId}`;
  const data = localStorage.getItem(key);
  
  let profile: CivicProfile;
  if (!data) {
    // Generate personalized starting points/stats based on user ID to differentiate starting profiles!
    const charCodeSum = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const startPoints = 100 + (charCodeSum % 150);
    const reports = charCodeSum % 3;
    const verifications = charCodeSum % 5;
    
    profile = {
      points: startPoints,
      level: getLevel(startPoints),
      badges: [],
      reportsCount: reports + verifications,
      verificationsCount: verifications,
      potholeReportsCount: reports,
      environmentalReportsCount: 0
    };
    localStorage.setItem(key, JSON.stringify(profile));
  } else {
    try {
      profile = JSON.parse(data) as CivicProfile;
    } catch (e) {
      profile = { ...DEFAULT_PROFILE };
    }
  }

  // Update name and calculate dynamically
  profile.displayName = localStorage.getItem('urbanpulse_current_user_name') || getActiveUserEmail().split('@')[0];
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
  
  updateSharedRegistry(userId, profile);
  
  return profile;
}

export function updateUserCivicProfile(profile: CivicProfile): void {
  const userId = getActiveUserId();
  const key = `urbanpulse_civic_profile_${userId}`;
  localStorage.setItem(key, JSON.stringify(profile));
  updateSharedRegistry(userId, profile);
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

export function getLeaderboard(): LeaderboardUser[] {
  const activeUserId = getActiveUserId();
  const currentProfile = getUserCivicProfile();
  
  const defaultMockUsers: LeaderboardUser[] = [
    { name: 'Amit Sharma (Bengaluru)', points: 720, level: 'Community Guardian', badgesCount: 3 },
    { name: 'Priya Patel (Ahmedabad)', points: 510, level: 'Civic Champion', badgesCount: 2 },
    { name: 'Rajesh Kumar (Chennai)', points: 380, level: 'Civic Champion', badgesCount: 1 },
    { name: 'Ananya Reddy (Hyderabad)', points: 260, level: 'Civic Champion', badgesCount: 1 }
  ];
  
  const registryKey = 'urbanpulse_leaderboard_registry';
  const data = localStorage.getItem(registryKey);
  const registry = data ? JSON.parse(data) : {};
  
  const leaderboardUsers: LeaderboardUser[] = [];
  
  Object.keys(registry).forEach(uid => {
    const isCurrent = uid === activeUserId;
    leaderboardUsers.push({
      name: registry[uid].name,
      points: registry[uid].points,
      level: registry[uid].level,
      badgesCount: registry[uid].badgesCount,
      isCurrentUser: isCurrent
    });
  });
  
  const hasCurrentUser = leaderboardUsers.some(u => u.isCurrentUser);
  if (!hasCurrentUser) {
    leaderboardUsers.push({
      name: currentProfile.displayName || 'You',
      points: currentProfile.points,
      level: currentProfile.level,
      badgesCount: currentProfile.badges.length,
      isCurrentUser: true
    });
  }
  
  defaultMockUsers.forEach(mockUser => {
    if (!leaderboardUsers.some(u => u.name.split(' ')[0] === mockUser.name.split(' ')[0])) {
      leaderboardUsers.push(mockUser);
    }
  });
  
  leaderboardUsers.sort((a, b) => b.points - a.points);
  
  return leaderboardUsers.slice(0, 5);
}
