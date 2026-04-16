const pool = require('./config/db');

async function seedAchievements() {
  console.log('🏆 Seeding Achievements Database\n');
  
  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Check if achievements already exist
    const checkResult = await client.query('SELECT COUNT(*) FROM achievements');
    const count = parseInt(checkResult.rows[0].count);
    
    if (count > 0) {
      console.log(`⚠️  Found ${count} existing achievements`);
      console.log('Skipping seed to prevent duplicates.\n');
      console.log('To reseed, run:');
      console.log('  DELETE FROM achievements;');
      console.log('  DELETE FROM user_achievements;\n');
      return;
    }

    console.log('📝 Inserting achievements...\n');

    const achievements = [
      // Running achievements
      {
        name: 'First Steps',
        description: 'Complete your first run',
        icon: '🏃',
        category: 'running',
        requirement_type: 'runs',
        requirement_value: 1,
        xp_reward: 50,
        badge_tier: 'bronze'
      },
      {
        name: 'Getting Started',
        description: 'Complete 5 runs',
        icon: '👟',
        category: 'running',
        requirement_type: 'runs',
        requirement_value: 5,
        xp_reward: 100,
        badge_tier: 'bronze'
      },
      {
        name: 'Dedicated Runner',
        description: 'Complete 25 runs',
        icon: '🔥',
        category: 'running',
        requirement_type: 'runs',
        requirement_value: 25,
        xp_reward: 250,
        badge_tier: 'silver'
      },
      {
        name: 'Marathon Mindset',
        description: 'Complete 100 runs',
        icon: '💪',
        category: 'running',
        requirement_type: 'runs',
        requirement_value: 100,
        xp_reward: 500,
        badge_tier: 'gold'
      },
      
      // Distance achievements
      {
        name: 'First Kilometer',
        description: 'Run 1 km total distance',
        icon: '📏',
        category: 'distance',
        requirement_type: 'distance',
        requirement_value: 1000,
        xp_reward: 50,
        badge_tier: 'bronze'
      },
      {
        name: '5K Runner',
        description: 'Run 5 km total distance',
        icon: '🎯',
        category: 'distance',
        requirement_type: 'distance',
        requirement_value: 5000,
        xp_reward: 150,
        badge_tier: 'bronze'
      },
      {
        name: '10K Champion',
        description: 'Run 10 km total distance',
        icon: '⭐',
        category: 'distance',
        requirement_type: 'distance',
        requirement_value: 10000,
        xp_reward: 300,
        badge_tier: 'silver'
      },
      {
        name: 'Half Marathon',
        description: 'Run 21 km total distance',
        icon: '🏅',
        category: 'distance',
        requirement_type: 'distance',
        requirement_value: 21000,
        xp_reward: 500,
        badge_tier: 'gold'
      },
      {
        name: 'Ultra Runner',
        description: 'Run 50 km total distance',
        icon: '🚀',
        category: 'distance',
        requirement_type: 'distance',
        requirement_value: 50000,
        xp_reward: 1000,
        badge_tier: 'platinum'
      },
      
      // Territory achievements
      {
        name: 'Territory Pioneer',
        description: 'Capture your first territory',
        icon: '🗺️',
        category: 'territory',
        requirement_type: 'tiles',
        requirement_value: 1,
        xp_reward: 100,
        badge_tier: 'bronze'
      },
      {
        name: 'Area Explorer',
        description: 'Capture 10 territories',
        icon: '🧭',
        category: 'territory',
        requirement_type: 'tiles',
        requirement_value: 10,
        xp_reward: 200,
        badge_tier: 'bronze'
      },
      {
        name: 'City Conqueror',
        description: 'Capture 50 territories',
        icon: '👑',
        category: 'territory',
        requirement_type: 'tiles',
        requirement_value: 50,
        xp_reward: 500,
        badge_tier: 'silver'
      },
      {
        name: 'Zone Master',
        description: 'Capture 100 territories',
        icon: '🏆',
        category: 'territory',
        requirement_type: 'tiles',
        requirement_value: 100,
        xp_reward: 1000,
        badge_tier: 'gold'
      },
      
      // Streak achievements
      {
        name: 'Consistent Starter',
        description: 'Maintain a 3-day running streak',
        icon: '📅',
        category: 'streak',
        requirement_type: 'streak',
        requirement_value: 3,
        xp_reward: 100,
        badge_tier: 'bronze'
      },
      {
        name: 'Week Warrior',
        description: 'Maintain a 7-day running streak',
        icon: '⚡',
        category: 'streak',
        requirement_type: 'streak',
        requirement_value: 7,
        xp_reward: 250,
        badge_tier: 'silver'
      },
      {
        name: 'Monthly Mile Machine',
        description: 'Maintain a 30-day running streak',
        icon: '🔥',
        category: 'streak',
        requirement_type: 'streak',
        requirement_value: 30,
        xp_reward: 1000,
        badge_tier: 'gold'
      },
      
      // Social achievements
      {
        name: 'Social Runner',
        description: 'Create your first post',
        icon: '💬',
        category: 'social',
        requirement_type: 'posts',
        requirement_value: 1,
        xp_reward: 50,
        badge_tier: 'bronze'
      },
      {
        name: 'Community Builder',
        description: 'Create 10 posts',
        icon: '📢',
        category: 'social',
        requirement_type: 'posts',
        requirement_value: 10,
        xp_reward: 200,
        badge_tier: 'silver'
      }
    ];

    let inserted = 0;
    for (const ach of achievements) {
      const result = await client.query(
        `INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, xp_reward, badge_tier)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [ach.name, ach.description, ach.icon, ach.category, ach.requirement_type, ach.requirement_value, ach.xp_reward, ach.badge_tier]
      );
      inserted++;
      console.log(`   ✅ ${ach.icon} ${ach.name}`);
    }

    console.log(`\n🎉 Successfully inserted ${inserted} achievements!\n`);
    console.log('💡 Tips:');
    console.log('   - Achievements will unlock automatically as users run');
    console.log('   - Users earn XP rewards when achievements unlock');
    console.log('   - Badge tiers: bronze, silver, gold, platinum\n');

  } catch (error) {
    console.error('❌ Error seeding achievements:', error.message);
    console.error(error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

seedAchievements();
