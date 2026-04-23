import * as cheerio from 'cheerio';

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export type NaverBlogPost = {
  title: string;
  content: string;
  mobileUrl: string;
};

export async function fetchNaverBlog(inputUrl: string): Promise<NaverBlogPost> {
  const mobileUrl = toMobileUrl(inputUrl);
  if (!mobileUrl) {
    throw new Error('네이버 블로그 URL 형식이 아닙니다 (예: https://blog.naver.com/아이디/글번호)');
  }

  const res = await fetch(mobileUrl, {
    headers: { 'User-Agent': MOBILE_UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`블로그 글을 불러올 수 없습니다 (HTTP ${res.status})`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('.se-title-text').text().trim() ||
    $('.se_title').text().trim() ||
    $('h3.tit_h3').text().trim() ||
    $('title').text().trim() ||
    '제목 없음';

  const selectors = [
    '.se-main-container',
    '.se_component_wrap',
    '#postViewArea',
    '.post_ct',
    '#viewTypeSelector',
  ];

  let content = '';
  for (const sel of selectors) {
    const $el = $(sel);
    if ($el.length === 0) continue;
    $el.find('script, style, noscript').remove();
    const text = $el.text().trim();
    if (text.length > content.length) content = text;
  }

  if (content.length < 50) {
    const $body = $('body').clone();
    $body.find('script, style, noscript, nav, header, footer').remove();
    content = $body.text().trim();
  }

  content = content
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();

  if (content.length < 50) {
    throw new Error('블로그 본문을 추출할 수 없었습니다. 비공개 글이거나 구조가 특이한 글일 수 있어요.');
  }

  return { title, content, mobileUrl };
}

function toMobileUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (!/(^|\.)blog\.naver\.com$/.test(u.hostname) && u.hostname !== 'm.blog.naver.com') {
      return null;
    }

    const pathMatch = u.pathname.match(/^\/([^/?#]+)\/(\d+)/);
    if (pathMatch) {
      return `https://m.blog.naver.com/${pathMatch[1]}/${pathMatch[2]}`;
    }

    const blogId = u.searchParams.get('blogId');
    const logNo = u.searchParams.get('logNo');
    if (blogId && logNo) {
      return `https://m.blog.naver.com/${blogId}/${logNo}`;
    }

    return null;
  } catch {
    return null;
  }
}
