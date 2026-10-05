import { useCallback, useState, useEffect, useMemo } from 'react';
import FingerPlayer, { type WatchProgressPayload } from './components/FingerPlayer';
import type { FingerProviderId } from './lib/fingerApi';
import {
  Play,
  Film,
  Tv,
  Globe,
  CheckCircle2,
  ExternalLink,
  Code,
  Layers,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface PresetItem {
  id: string;
  title: string;
  type: 'movie' | 'series';
  year: number;
  season?: number;
  episode?: number;
  imdbId?: string;
  description: string;
}

const PRESETS: PresetItem[] = [
  {
    id: '550',
    title: 'Fight Club',
    type: 'movie',
    year: 1999,
    imdbId: 'tt0137523',
    description: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
  },
  {
    id: '157336',
    title: 'Interstellar',
    type: 'movie',
    year: 2014,
    imdbId: 'tt0816692',
    description: 'When Earth becomes uninhabitable, a farmer and ex-NASA pilot is tasked to pilot a spacecraft.',
  },
  {
    id: '1396',
    title: 'Breaking Bad',
    type: 'series',
    year: 2008,
    season: 1,
    episode: 1,
    imdbId: 'tt0903747',
    description: 'A chemistry teacher diagnosed with terminal lung cancer turns to manufacturing methamphetamine.',
  },
  {
    id: '66732',
    title: 'Stranger Things',
    type: 'series',
    year: 2016,
    season: 1,
    episode: 1,
    imdbId: 'tt4574334',
    description: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments.',
  },
];

function isDesktopProvider(value: string | null): value is FingerProviderId {
  return value === 'movy' || value === 'vidfast' || value === 'vixsrc';
}

export default function App() {
  const [urlParams, setUrlParams] = useState(() => new URLSearchParams(window.location.search));

  const initialEmbed = urlParams.get('embed') === 'true' || urlParams.get('embed') === '1';
  const initialType = (urlParams.get('type') === 'series' || urlParams.get('type') === 'tv') ? 'series' : 'movie';
  const initialId = urlParams.get('id') || urlParams.get('tmdbId') || '550';
  const initialTitle = urlParams.get('title') || (initialId === '550' ? 'Fight Club' : 'Media Title');
  const initialYear = Number(urlParams.get('year') || '1999');
  const initialSeason = Number(urlParams.get('s') || urlParams.get('season') || '1');
  const initialEpisode = Number(urlParams.get('e') || urlParams.get('episode') || '1');
  const initialImdbId = urlParams.get('imdbId') || (initialId === '550' ? 'tt0137523' : undefined);
  const initialExtractUrl = urlParams.get('url') || urlParams.get('extractUrl') || '';
  const initialProvider = isDesktopProvider(urlParams.get('provider'))
    ? urlParams.get('provider') as FingerProviderId
    : 'movy';

  // Form state
  const [activeTab, setActiveTab] = useState<'media' | 'extract'>(initialExtractUrl ? 'extract' : 'media');
  const [mediaId, setMediaId] = useState(initialId);
  const [mediaType, setMediaType] = useState<'movie' | 'series'>(initialType);
  const [title, setTitle] = useState(initialTitle);
  const [releaseYear, setReleaseYear] = useState(initialYear);
  const [season, setSeason] = useState(initialSeason);
  const [episode, setEpisode] = useState(initialEpisode);
  const [imdbId, setImdbId] = useState(initialImdbId || '');
  const [provider, setProvider] = useState<FingerProviderId>(initialProvider);
  const [extractUrl, setExtractUrl] = useState(initialExtractUrl);

  // Playback trigger state
  const [playbackKey, setPlaybackKey] = useState(0);
  const [activePlayback, setActivePlayback] = useState<{
    mediaId: string;
    type: 'movie' | 'series';
    title: string;
    releaseYear: number;
    season: number;
    episode: number;
    imdbId?: string;
    extractUrl?: string;
    provider: FingerProviderId;
  }>({
    mediaId: initialId,
    type: initialType,
    title: initialTitle,
    releaseYear: initialYear,
    season: initialSeason,
    episode: initialEpisode,
    imdbId: initialImdbId,
    extractUrl: initialExtractUrl || undefined,
    provider: initialProvider,
  });

  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [lastProgress, setLastProgress] = useState<WatchProgressPayload | null>(null);
  const activePreset = PRESETS.find(
    preset => preset.id === activePlayback.mediaId && preset.type === activePlayback.type
  );

  const handleProviderChange = useCallback((nextProvider: FingerProviderId) => {
    setProvider(nextProvider);
    setActivePlayback(previous => ({ ...previous, provider: nextProvider }));
    const params = new URLSearchParams(window.location.search);
    params.set('provider', nextProvider);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    setUrlParams(params);
  }, []);

  // Sync URL search params
  const syncUrl = (nextState = activePlayback) => {
    const params = new URLSearchParams();
    if (nextState.extractUrl) {
      params.set('url', nextState.extractUrl);
    } else {
      params.set('id', nextState.mediaId);
      params.set('type', nextState.type);
      if (nextState.title) params.set('title', nextState.title);
      if (nextState.releaseYear) params.set('year', String(nextState.releaseYear));
      if (nextState.type === 'series') {
        params.set('s', String(nextState.season));
        params.set('e', String(nextState.episode));
      }
      if (nextState.imdbId) params.set('imdbId', nextState.imdbId);
      if (nextState.provider) params.set('provider', nextState.provider);
    }
    const newQuery = params.toString();
    const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`;
    window.history.replaceState({}, '', newUrl);
    setUrlParams(params);
  };

  const handleApplyMedia = () => {
    const next = {
      mediaId: mediaId.trim() || '550',
      type: mediaType,
      title: title.trim() || (mediaType === 'movie' ? 'Movie' : 'Series'),
      releaseYear: releaseYear || 2024,
      season: mediaType === 'series' ? season : 1,
      episode: mediaType === 'series' ? episode : 1,
      imdbId: imdbId.trim() || undefined,
      extractUrl: undefined,
      provider,
    };
    setActivePlayback(next);
    setPlaybackKey(prev => prev + 1);
    syncUrl(next);
  };

  const handleApplyExtract = () => {
    if (!extractUrl.trim()) return;
    const next = {
      mediaId: 'extract',
      type: 'movie' as const,
      title: 'Extracted Stream',
      releaseYear: new Date().getFullYear(),
      season: 1,
      episode: 1,
      extractUrl: extractUrl.trim(),
      provider,
    };
    setActivePlayback(next);
    setPlaybackKey(prev => prev + 1);
    syncUrl(next);
  };

  const handleSelectPreset = (preset: PresetItem) => {
    setActiveTab('media');
    setMediaId(preset.id);
    setMediaType(preset.type);
    setTitle(preset.title);
    setReleaseYear(preset.year);
    setSeason(preset.season || 1);
    setEpisode(preset.episode || 1);
    setImdbId(preset.imdbId || '');
    setExtractUrl('');

    const next = {
      mediaId: preset.id,
      type: preset.type,
      title: preset.title,
      releaseYear: preset.year,
      season: preset.season || 1,
      episode: preset.episode || 1,
      imdbId: preset.imdbId,
      extractUrl: undefined,
      provider,
    };
    setActivePlayback(next);
    setPlaybackKey(prev => prev + 1);
    syncUrl(next);
  };

  const embedUrl = useMemo(() => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    const params = new URLSearchParams();
    params.set('embed', '1');
    if (activePlayback.extractUrl) {
      params.set('url', activePlayback.extractUrl);
    } else {
      params.set('id', activePlayback.mediaId);
      params.set('type', activePlayback.type);
      if (activePlayback.type === 'series') {
        params.set('s', String(activePlayback.season));
        params.set('e', String(activePlayback.episode));
      }
      if (activePlayback.provider) params.set('provider', activePlayback.provider);
    }
    return `${origin}${path}?${params.toString()}`;
  }, [activePlayback]);

  const embedIframeCode = `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture"></iframe>`;

  // If running in clean embed mode (?embed=1), display ONLY the player
  if (initialEmbed) {
    return (
      <div className="w-screen h-screen bg-black overflow-hidden m-0 p-0">
        <FingerPlayer
          key={`embed-${playbackKey}-${activePlayback.mediaId}-${activePlayback.season}-${activePlayback.episode}`}
          mediaId={activePlayback.mediaId}
          type={activePlayback.type}
          title={activePlayback.title}
          releaseYear={activePlayback.releaseYear}
          description={activePreset?.description}
          season={activePlayback.season}
          episode={activePlayback.episode}
          imdbId={activePlayback.imdbId}
          initialProvider={activePlayback.provider}
          onProviderChange={handleProviderChange}
          extractUrl={activePlayback.extractUrl}
          canGoNextEpisode={activePlayback.type === 'series'}
          onNextEpisode={() => {
            setEpisode(e => e + 1);
            setActivePlayback(prev => ({ ...prev, episode: prev.episode + 1 }));
            setPlaybackKey(k => k + 1);
          }}
          onProgress={setLastProgress}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06070a] text-zinc-100 flex flex-col selection:bg-white selection:text-black">
      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-[#090b10]/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-zinc-100 to-zinc-400 text-black flex items-center justify-center font-black tracking-wider shadow-lg shadow-white/10">
            FP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-white">FingerPlayer</h1>
              <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Cloudflare Ready
              </span>
            </div>
            <p className="text-xs text-zinc-400">Ultra-Modern HLS & MP4 Player with Edge Proxy & Scrapers</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowEmbedModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors border border-zinc-700/60"
          >
            <Code className="w-3.5 h-3.5" />
            Embed Code
          </button>
          <a
            href="/api/health"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-800"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            API Health
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 space-y-6">
        {/* Main Video Canvas */}
        <section className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black border border-zinc-800/80 bg-black aspect-video w-full max-h-[75vh]">
          <FingerPlayer
            key={`player-${playbackKey}-${activePlayback.mediaId}-${activePlayback.season}-${activePlayback.episode}`}
            mediaId={activePlayback.mediaId}
            type={activePlayback.type}
            title={activePlayback.title}
            releaseYear={activePlayback.releaseYear}
            description={activePreset?.description}
            season={activePlayback.season}
            episode={activePlayback.episode}
            imdbId={activePlayback.imdbId}
            initialProvider={activePlayback.provider}
            onProviderChange={handleProviderChange}
            extractUrl={activePlayback.extractUrl}
            canGoNextEpisode={activePlayback.type === 'series'}
            onNextEpisode={() => {
              setEpisode(e => e + 1);
              const next = { ...activePlayback, episode: activePlayback.episode + 1 };
              setActivePlayback(next);
              setPlaybackKey(k => k + 1);
              syncUrl(next);
            }}
            onProgress={setLastProgress}
          />
        </section>

        {/* Control and Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stream Selector Card */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-5 lg:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('media')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'media'
                      ? 'bg-white text-black shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  TMDB Media
                </button>
                <button
                  onClick={() => setActiveTab('extract')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'extract'
                      ? 'bg-white text-black shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Direct URL / Extract
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Active:</span>
                <span className="text-xs font-medium text-emerald-400 capitalize">
                  {activePlayback.extractUrl ? 'Custom URL' : `${activePlayback.type}: ${activePlayback.title}`}
                </span>
              </div>
            </div>

            {activeTab === 'media' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Media Type</label>
                    <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-1">
                      <button
                        type="button"
                        onClick={() => setMediaType('movie')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-all ${
                          mediaType === 'movie' ? 'bg-zinc-700 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Film className="w-3 h-3" />
                        Movie
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaType('series')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-all ${
                          mediaType === 'series' ? 'bg-zinc-700 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Tv className="w-3 h-3" />
                        Series
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">TMDB ID</label>
                    <input
                      type="text"
                      value={mediaId}
                      onChange={e => setMediaId(e.target.value)}
                      placeholder="e.g. 550"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">IMDb ID (optional)</label>
                    <input
                      type="text"
                      value={imdbId}
                      onChange={e => setImdbId(e.target.value)}
                      placeholder="e.g. tt0137523"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Title"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Release Year</label>
                    <input
                      type="number"
                      value={releaseYear}
                      onChange={e => setReleaseYear(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                </div>

                {mediaType === 'series' && (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Season</label>
                      <input
                        type="number"
                        min="1"
                        value={season}
                        onChange={e => setSeason(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Episode</label>
                      <input
                        type="number"
                        min="1"
                        value={episode}
                        onChange={e => setEpisode(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleApplyMedia}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-xs tracking-wide transition-all shadow-lg shadow-white/10"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  Load & Play Stream
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Embed URL or Direct Stream (.m3u8 / .mp4)
                  </label>
                  <input
                    type="text"
                    value={extractUrl}
                    onChange={e => setExtractUrl(e.target.value)}
                    placeholder="https://... or any video page"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    The backend extractor will resolve the underlying media stream and route segments through the Cloudflare proxy.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleApplyExtract}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-xs tracking-wide transition-all shadow-lg shadow-white/10"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  Extract & Play Stream
                </button>
              </div>
            )}
          </div>

          {/* Quick Presets & System Info Card */}
          <div className="glass-panel rounded-2xl p-5 lg:p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-xs text-white tracking-wide uppercase">Quick 1-Click Tests</h3>
              </div>
              <div className="space-y-2">
                {PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="w-full text-left p-2.5 rounded-xl glass-card flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                          {preset.title}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {preset.year}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 uppercase">
                          {preset.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{preset.description}</p>
                    </div>
                    <Play className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* Architecture Card */}
            <div className="border-t border-zinc-800 pt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  Engine:
                </span>
                <span className="text-zinc-200 font-mono text-[11px]">Shaka Player + Cloudflare Worker</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Watch Progress:</span>
                <span className="text-emerald-400 font-mono text-[11px]">
                  {lastProgress ? `${Math.round(lastProgress.progress)}% (${Math.round(lastProgress.currentTime)}s)` : 'LocalStorage Sync'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Proxy Public Base:</span>
                <span className="text-zinc-300 font-mono text-[11px]">/api/stream-proxy</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Embed Modal */}
      {showEmbedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full glass-panel rounded-2xl p-6 space-y-4 border border-zinc-700/80 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-white" />
                <h3 className="font-bold text-sm text-white">Embed FingerPlayer</h3>
              </div>
              <button
                onClick={() => setShowEmbedModal(false)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Use this responsive iframe embed code to integrate FingerPlayer into any web application or CMS.
            </p>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Direct Embed URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={embedUrl}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(embedUrl);
                    setCopiedShare(true);
                    setTimeout(() => setCopiedShare(false), 2000);
                  }}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white flex items-center gap-1.5"
                >
                  {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedShare ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                IFrame Snippet
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  rows={3}
                  value={embedIframeCode}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-300 resize-none select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(embedIframeCode);
                    setCopiedEmbed(true);
                    setTimeout(() => setCopiedEmbed(false), 2000);
                  }}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-medium text-white flex items-center gap-1 border border-zinc-700"
                >
                  {copiedEmbed ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedEmbed ? 'Copied' : 'Copy HTML'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-[#050608] py-4 px-4 lg:px-8 text-center text-xs text-zinc-500">
        <p>FingerPlayer Standalone Site · Cloudflare Pages & Workers Native Architecture</p>
      </footer>
    </div>
  );
}
