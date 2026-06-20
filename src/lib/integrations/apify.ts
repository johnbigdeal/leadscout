import { ApifyClient } from "apify-client";

export const apifyClient = new ApifyClient({
  token: process.env.APIFY_TOKEN!,
});

type GooglePlacesInput = {
  searchStringsArray: string[];
  maxCrawledPlacesPerSearch: number;
  language?: string;
  maxReviews?: number;
  includeUnfilteredResults?: boolean;
  locationQuery?: string;
};

export async function startGooglePlacesSearch(
  queries: string[],
  locationQuery: string,
  maxResults: number = 100,
) {
  const input: GooglePlacesInput = {
    searchStringsArray: queries,
    maxCrawledPlacesPerSearch: maxResults,
    language: "es",
    includeUnfilteredResults: true,
    locationQuery,
  };
  return apifyClient.actor("compass/crawler-google-places").call(input);
}

type InstagramSearchInput = {
  addParentData: false;
  directUrls: string[];
  enhanceUserSearchWithFacebookPage: false;
  isUserReelFeedURL: false;
  isUserTaggedFeedURL: false;
  resultsLimit: number;
  resultsType: "details";
  searchLimit: number;
  searchType: "hashtag";
};

export async function searchInstagram(query: string, maxItems: number = 10) {
  const hashtag = query.startsWith("#") ? query.slice(1) : query;
  const input: InstagramSearchInput = {
    addParentData: false,
    directUrls: [
      `https://www.instagram.com/explore/search/keyword/?q=%23${encodeURIComponent(hashtag)}`,
    ],
    enhanceUserSearchWithFacebookPage: false,
    isUserReelFeedURL: false,
    isUserTaggedFeedURL: false,
    resultsLimit: maxItems,
    resultsType: "details",
    searchLimit: 1,
    searchType: "hashtag",
  };
  return apifyClient.actor("apify/instagram-search-scraper").call(input);
}

export async function scrapeLinkedInComments(postUrl: string, maxComments: number = 100) {
  return apifyClient.actor("benjarapi/linkedin-post-comments").call({
    postUrl,
    maxComments,
    sortOrder: "RELEVANCE",
  });
}

type InstagramProfileInput = {
  username: string;
};

export async function scrapeInstagramProfile(username: string) {
  const input: InstagramProfileInput = { username };
  return apifyClient.actor("apify/instagram-profile-scraper").call(input);
}
