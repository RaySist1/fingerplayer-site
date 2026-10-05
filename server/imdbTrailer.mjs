const IMDB_GRAPHQL = 'https://api.graphql.imdb.com/';

const TRAILER_QUERY = `
query TitlePrimaryVideo($id: ID!) {
  title(id: $id) {
    primaryVideos(first: 5) {
      edges {
        node {
          id
          contentType { id }
          playbackURLs {
            displayName { value }
            videoMimeType
            url
          }
        }
      }
    }
    latestTrailer {
      id
      contentType { id }
      playbackURLs {
        displayName { value }
        videoMimeType
        url
      }
    }
  }
}
`;

const QUALITY_RANK = {
  '1080p': 5,
  '720p': 4,
  '480p': 3,
  HD: 3,
  SD: 2,
  AUTO: 1,
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
    body: JSON.stringify(body),
  };
}

export function normalizeImdbId(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const id = raw.startsWith('tt') ? raw : `tt${raw}`;
  return /^tt\d+$/.test(id) ? id : null;
}

function pickBestMp4(urls) {
  const mp4s = (Array.isArray(urls) ? urls : []).filter(
    item => item?.url && String(item.videoMimeType || '').toUpperCase() === 'MP4'
  );
  if (!mp4s.length) return null;
  mp4s.sort(
    (a, b) =>
      (QUALITY_RANK[b.displayName?.value] || 0) - (QUALITY_RANK[a.displayName?.value] || 0)
  );
  return mp4s[0]?.url || null;
}

function pickVideoUrls(video) {
  return pickBestMp4(video?.playbackURLs);
}

function isTrailerType(contentTypeId) {
  return String(contentTypeId || '').toLowerCase().includes('trailer');
}

async function fetchImdbTrailerMp4(imdbId) {
  const res = await fetch(IMDB_GRAPHQL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      origin: 'https://www.imdb.com',
      referer: 'https://www.imdb.com/',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'x-imdb-client-name': 'imdb-web-next',
    },
    body: JSON.stringify({
      query: TRAILER_QUERY,
      operationName: 'TitlePrimaryVideo',
      variables: { id: imdbId },
    }),
  });

  if (!res.ok) {
    const err = new Error(`IMDb trailer lookup returned ${res.status}`);
    err.statusCode = 502;
    throw err;
  }

  const json = await res.json();
  const title = json?.data?.title;
  const primary = Array.isArray(title?.primaryVideos?.edges)
    ? title.primaryVideos.edges.map(edge => edge?.node).filter(Boolean)
    : [];

  const overlay =
    primary.find(video => isTrailerType(video.contentType?.id)) || primary[0];
  return pickVideoUrls(overlay) || pickVideoUrls(title?.latestTrailer);
}

export async function handleImdbTrailerRequest(options = {}) {
  try {
    const imdbId = normalizeImdbId(options.imdbId);
    if (!imdbId) {
      return jsonResponse(400, { error: 'imdbId is required' });
    }

    const mp4 = await fetchImdbTrailerMp4(imdbId);
    if (!mp4) {
      return jsonResponse(404, { error: 'No IMDb trailer found' });
    }

    return jsonResponse(200, { mp4, imdbId });
  } catch (err) {
    return jsonResponse(err.statusCode || 500, {
      error: err.message || 'IMDb trailer lookup failed',
    });
  }
}
