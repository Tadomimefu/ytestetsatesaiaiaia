import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Zap, Trophy, Sparkles } from 'lucide-react';

// Game types
interface Position {
  x: number;
  y: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  type: 'basic' | 'fast' | 'tank';
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 40;
const BULLET_SIZE = 6;
const ENEMY_SIZE = 35;
const PLAYER_SPEED = 8;
const BULLET_SPEED = 12;
const ENEMY_SPEED = 2;

// Retro colors
const COLORS = {
  player: '#00ff00',
  bullet: '#ffff00',
  enemyBasic: '#ff0040',
  enemyFast: '#ff8000',
  enemyTank: '#8000ff',
  star: '#ffffff',
};

function App() {
  // Device detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Game state
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory'>('menu');
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  
  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  // Game entities
  const playerRef = useRef<Position>({ x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 80 });
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Position[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const bulletIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const particleIdRef = useRef(0);
  const lastShotRef = useRef(0);
  const waveInProgressRef = useRef(false);
  
  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouch || isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Initialize stars background
  useEffect(() => {
    const stars: Position[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
      });
    }
    starsRef.current = stars;
  }, []);
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === ' ' && gameState === 'playing') {
        e.preventDefault();
        shoot();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);
  
  // Create explosion particles
  const createExplosion = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        color,
      });
    }
  }, []);
  
  // Spawn wave of enemies
  const spawnWave = useCallback((waveNum: number) => {
    const baseCount = 5;
    const enemyCount = Math.floor(baseCount * Math.pow(1.1, waveNum - 1));
    const newEnemies: Enemy[] = [];
    
    for (let i = 0; i < enemyCount; i++) {
      const typeRandom = Math.random();
      let type: Enemy['type'] = 'basic';
      if (typeRandom > 0.7) type = 'fast';
      else if (typeRandom > 0.9) type = 'tank';
      
      newEnemies.push({
        id: enemyIdRef.current++,
        x: 50 + (i % 8) * 90 + Math.random() * 30,
        y: -50 - Math.floor(i / 8) * 60,
        type,
      });
    }
    
    enemiesRef.current = [...enemiesRef.current, ...newEnemies];
    waveInProgressRef.current = true;
  }, []);
  
  // Shoot bullet
  const shoot = useCallback(() => {
    const now = Date.now();
    if (now - lastShotRef.current < 200) return;
    lastShotRef.current = now;
    
    bulletsRef.current.push({
      id: bulletIdRef.current++,
      x: playerRef.current.x + PLAYER_SIZE / 2,
      y: playerRef.current.y,
    });
  }, []);
  
  // Mobile controls
  const moveLeft = useCallback(() => {
    playerRef.current.x = Math.max(0, playerRef.current.x - PLAYER_SPEED * 3);
  }, []);
  
  const moveRight = useCallback(() => {
    playerRef.current.x = Math.min(CANVAS_WIDTH - PLAYER_SIZE, playerRef.current.x + PLAYER_SPEED * 3);
  }, []);
  
  // Start game
  const startGame = () => {
    setGameState('playing');
    setWave(1);
    setScore(0);
    setLives(3);
    playerRef.current = { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 80 };
    bulletsRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    spawnWave(1);
  };
  
  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const gameLoop = () => {
      // Clear canvas
      ctx.fillStyle = '#000011';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw stars
      ctx.fillStyle = COLORS.star;
      starsRef.current.forEach(star => {
        star.y += 0.5;
        if (star.y > CANVAS_HEIGHT) star.y = 0;
        ctx.fillRect(star.x, star.y, 2, 2);
      });
      
      // Handle keyboard movement (PC)
      if (!isMobile) {
        if (keysRef.current.has('ArrowLeft')) {
          playerRef.current.x = Math.max(0, playerRef.current.x - PLAYER_SPEED);
        }
        if (keysRef.current.has('ArrowRight')) {
          playerRef.current.x = Math.min(CANVAS_WIDTH - PLAYER_SIZE, playerRef.current.x + PLAYER_SPEED);
        }
      }
      
      // Update and draw bullets
      bulletsRef.current = bulletsRef.current.filter(bullet => {
        bullet.y -= BULLET_SPEED;
        
        // Draw bullet (retro style)
        ctx.fillStyle = COLORS.bullet;
        ctx.fillRect(bullet.x - BULLET_SIZE / 2, bullet.y, BULLET_SIZE, 15);
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.bullet;
        ctx.fillRect(bullet.x - BULLET_SIZE / 2, bullet.y, BULLET_SIZE, 15);
        ctx.shadowBlur = 0;
        
        return bullet.y > -20;
      });
      
      // Update and draw enemies
      enemiesRef.current = enemiesRef.current.filter(enemy => {
        const speed = enemy.type === 'fast' ? ENEMY_SPEED * 1.5 : 
                      enemy.type === 'tank' ? ENEMY_SPEED * 0.6 : ENEMY_SPEED;
        enemy.y += speed;
        
        // Draw enemy based on type
        const color = enemy.type === 'basic' ? COLORS.enemyBasic :
                      enemy.type === 'fast' ? COLORS.enemyFast : COLORS.enemyTank;
        
        ctx.fillStyle = color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        
        // Draw retro enemy shape
        ctx.beginPath();
        if (enemy.type === 'basic') {
          ctx.moveTo(enemy.x + ENEMY_SIZE / 2, enemy.y);
          ctx.lineTo(enemy.x + ENEMY_SIZE, enemy.y + ENEMY_SIZE / 2);
          ctx.lineTo(enemy.x + ENEMY_SIZE / 2, enemy.y + ENEMY_SIZE);
          ctx.lineTo(enemy.x, enemy.y + ENEMY_SIZE / 2);
        } else if (enemy.type === 'fast') {
          ctx.moveTo(enemy.x + ENEMY_SIZE / 2, enemy.y + ENEMY_SIZE);
          ctx.lineTo(enemy.x + ENEMY_SIZE, enemy.y);
          ctx.lineTo(enemy.x, enemy.y);
        } else {
          ctx.rect(enemy.x + 5, enemy.y + 5, ENEMY_SIZE - 10, ENEMY_SIZE - 10);
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Check collision with player
        if (
          enemy.x < playerRef.current.x + PLAYER_SIZE &&
          enemy.x + ENEMY_SIZE > playerRef.current.x &&
          enemy.y < playerRef.current.y + PLAYER_SIZE &&
          enemy.y + ENEMY_SIZE > playerRef.current.y
        ) {
          createExplosion(enemy.x + ENEMY_SIZE / 2, enemy.y + ENEMY_SIZE / 2, color);
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameState('gameover');
            }
            return newLives;
          });
          return false;
        }
        
        return enemy.y < CANVAS_HEIGHT + 50;
      });
      
      // Check bullet-enemy collisions
      bulletsRef.current = bulletsRef.current.filter(bullet => {
        let hit = false;
        enemiesRef.current = enemiesRef.current.filter(enemy => {
          if (hit) return true;
          const color = enemy.type === 'basic' ? COLORS.enemyBasic :
                        enemy.type === 'fast' ? COLORS.enemyFast : COLORS.enemyTank;
          
          if (
            bullet.x > enemy.x &&
            bullet.x < enemy.x + ENEMY_SIZE &&
            bullet.y > enemy.y &&
            bullet.y < enemy.y + ENEMY_SIZE
          ) {
            hit = true;
            createExplosion(enemy.x + ENEMY_SIZE / 2, enemy.y + ENEMY_SIZE / 2, color);
            const points = enemy.type === 'basic' ? 100 : enemy.type === 'fast' ? 200 : 300;
            setScore(prev => prev + points);
            return false;
          }
          return true;
        });
        return !hit;
      });
      
      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 30;
        ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
        ctx.globalAlpha = 1;
        
        return particle.life > 0;
      });
      
      // Draw player ship (retro style)
      ctx.fillStyle = COLORS.player;
      ctx.shadowBlur = 15;
      ctx.shadowColor = COLORS.player;
      
      const px = playerRef.current.x;
      const py = playerRef.current.y;
      
      ctx.beginPath();
      ctx.moveTo(px + PLAYER_SIZE / 2, py);
      ctx.lineTo(px + PLAYER_SIZE, py + PLAYER_SIZE);
      ctx.lineTo(px + PLAYER_SIZE / 2, py + PLAYER_SIZE - 10);
      ctx.lineTo(px, py + PLAYER_SIZE);
      ctx.closePath();
      ctx.fill();
      
      // Engine flame
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.moveTo(px + PLAYER_SIZE / 2 - 5, py + PLAYER_SIZE - 5);
      ctx.lineTo(px + PLAYER_SIZE / 2 + 5, py + PLAYER_SIZE - 5);
      ctx.lineTo(px + PLAYER_SIZE / 2, py + PLAYER_SIZE + 15 + Math.random() * 10);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      // Check wave completion
      if (enemiesRef.current.length === 0 && waveInProgressRef.current) {
        waveInProgressRef.current = false;
        if (wave >= 10) {
          setGameState('victory');
        } else {
          setTimeout(() => {
            setWave(prev => prev + 1);
            spawnWave(wave + 1);
          }, 1500);
        }
      }
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, isMobile, wave, createExplosion, spawnWave]);
  
  // Menu screen
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-green-400 mb-4 tracking-wider animate-pulse"
              style={{ textShadow: '0 0 20px #00ff00, 0 0 40px #00ff00' }}>
            GALACTIC DEFENDER
          </h1>
          <p className="text-xl text-cyan-400 mb-8 tracking-widest">90s ARCADE EDITION</p>
          
          <div className="bg-gray-900 border-4 border-green-500 p-8 rounded-lg max-w-md mx-auto mb-8">
            <h2 className="text-2xl text-yellow-400 mb-4">HOW TO PLAY</h2>
            {isMobile ? (
              <div className="text-white text-left space-y-2">
                <p>📱 Mobile Controls:</p>
                <p>• Use arrow buttons to move</p>
                <p>• Tap FIRE to shoot</p>
              </div>
            ) : (
              <div className="text-white text-left space-y-2">
                <p>🖥️ PC Controls:</p>
                <p>• ← → Arrow keys to move</p>
                <p>• SPACE to shoot</p>
              </div>
            )}
            <div className="mt-4 text-gray-400 text-sm">
              <p>Survive 10 waves of aliens!</p>
              <p>Each wave gets harder (1.1x)</p>
            </div>
          </div>
          
          <button
            onClick={startGame}
            className="px-12 py-4 bg-green-500 hover:bg-green-600 text-black text-2xl font-bold rounded 
                       border-4 border-green-300 transform hover:scale-105 transition-all
                       shadow-lg shadow-green-500/50"
          >
            INSERT COIN / START
          </button>
        </div>
        
        {/* Retro scanline effect */}
        <div className="fixed inset-0 pointer-events-none opacity-10"
             style={{
               background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)'
             }} />
      </div>
    );
  }
  
  // Game Over screen
  if (gameState === 'gameover') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <h1 className="text-6xl font-bold text-red-500 mb-4"
            style={{ textShadow: '0 0 20px #ff0000' }}>
          GAME OVER
        </h1>
        <p className="text-2xl text-white mb-4">Final Score: {score.toLocaleString()}</p>
        <p className="text-xl text-gray-400 mb-8">You reached Wave {wave}</p>
        <button
          onClick={() => setGameState('menu')}
          className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-black text-xl font-bold rounded"
        >
          TRY AGAIN
        </button>
      </div>
    );
  }
  
  // Victory screen
  if (gameState === 'victory') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-bounce">
            <Trophy size={80} className="text-yellow-400 mx-auto mb-4" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-yellow-400 mb-4"
              style={{ textShadow: '0 0 30px #ffff00' }}>
            CONGRATULATIONS!
          </h1>
          <p className="text-2xl text-white mb-4">You saved the galaxy!</p>
          <p className="text-xl text-green-400 mb-8">Final Score: {score.toLocaleString()}</p>
          
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-lg max-w-md mx-auto mb-8">
            <Sparkles className="text-white mx-auto mb-2" size={32} />
            <p className="text-white text-lg mb-4">🎉 You've unlocked PREMIUM CONTENT! 🎉</p>
            <a 
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-red-500 hover:bg-red-600 text-white text-xl font-bold rounded
                         border-4 border-yellow-400 animate-pulse"
            >
              🔥 CLAIM YOUR PRIZE 🔥
            </a>
          </div>
          
          <button
            onClick={() => setGameState('menu')}
            className="px-8 py-3 bg-green-500 hover:bg-green-600 text-black text-xl font-bold rounded"
          >
            PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }
  
  // Game screen
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-2">
      {/* HUD */}
      <div className="w-full max-w-[800px] flex justify-between items-center mb-2 px-4">
        <div className="text-green-400 text-xl font-bold">SCORE: {score.toLocaleString()}</div>
        <div className="text-yellow-400 text-xl font-bold">WAVE: {wave}/10</div>
        <div className="text-red-400 text-xl font-bold">LIVES: {lives}</div>
      </div>
      
      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-4 border-green-500 max-w-full h-auto"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Wave announcement */}
        {enemiesRef.current.length === 0 && wave < 10 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold text-yellow-400 animate-pulse"
                 style={{ textShadow: '0 0 20px #ffff00' }}>
              WAVE {wave}
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Controls */}
      {isMobile && (
        <div className="w-full max-w-[800px] mt-4 flex justify-between items-center px-4">
          <div className="flex gap-4">
            <button
              onTouchStart={moveLeft}
              onMouseDown={moveLeft}
              className="w-20 h-20 bg-gray-700 active:bg-gray-600 rounded-full flex items-center justify-center
                         border-4 border-gray-500"
            >
              <ChevronLeft size={40} className="text-white" />
            </button>
            <button
              onTouchStart={moveRight}
              onMouseDown={moveRight}
              className="w-20 h-20 bg-gray-700 active:bg-gray-600 rounded-full flex items-center justify-center
                         border-4 border-gray-500"
            >
              <ChevronRight size={40} className="text-white" />
            </button>
          </div>
          
          <button
            onTouchStart={shoot}
            onMouseDown={shoot}
            className="w-24 h-24 bg-red-600 active:bg-red-500 rounded-full flex items-center justify-center
                       border-4 border-red-400 shadow-lg shadow-red-500/50"
          >
            <Zap size={40} className="text-white" />
          </button>
        </div>
      )}
      
      {/* PC Controls hint */}
      {!isMobile && (
        <div className="mt-4 text-gray-500 text-sm">
          ← → to move | SPACE to shoot
        </div>
      )}
      
      {/* Retro scanline effect */}
      <div className="fixed inset-0 pointer-events-none opacity-5"
           style={{
             background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)'
           }} />
    </div>
  );
}

export default App;
