import { Data, DataItem, Route, ViewType } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { load } from 'cheerio';

const feedTitle = 'Koran Tempo';
const feedDescription = 'Tempo.co daily newspaper';
const baseURL = 'https://koran.tempo.co';
const urlPrefix = 'https://koran.tempo.co/read';
const excludeCategories = ['info-tempo'];

export const route: Route = {
    path: '/koran',
    categories: ['new-media'],
    view: ViewType.Articles,
    example: '/tempoco/koran',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['koran.tempo.co/'],
        },
    ],
    name: feedTitle,
    maintainers: ['akhy'],
    url: 'koran.tempo.co',
    handler: async () => {
        const response = await ofetch(baseURL);
        const $ = load(response);

        const imageURL = $('div.logo img').first().attr('src');

        const articleUrls = (
            await Promise.all(
                $('div.masteredisi')
                    .toArray()
                    .map((el) => $(el).find('figure a').attr('href'))
                    .filter((url) => url !== null && url !== undefined)
                    .map(async (url) => {
                        const $ = await ofetch(url).then((response) => load(response));

                        return $('a')
                            .toArray()
                            .map((el) => $(el).attr('href'))
                            .filter((url) => url !== null && url !== undefined)
                            .filter((url) => url.startsWith(`${urlPrefix}/`))
                            .filter((url) => {
                                for (const category of excludeCategories) {
                                    if (url.startsWith(`${urlPrefix}/${category}`)) {
                                        return false;
                                    }
                                }

                                return true;
                            });
                    })
            )
        ).flat(1);

        const dataItems = (
            await Promise.all(
                [...new Set(articleUrls)].map((url) =>
                    cache.tryGet(url, async () => {
                        const $ = await ofetch(url).then((response) => load(response));

                        const item: DataItem = {
                            title: $('meta[property="og:title"]').attr('content') || '',
                            link: url,
                            description: $('meta[property="og:description"]').attr('content') || '',
                            image: $('meta[property="og:image"]').attr('content') || '',
                            author: $('meta[name="author"]').attr('content') || '',
                        };

                        const pubDate = $('meta[property="article:published_time"]').attr('content');
                        if (pubDate !== null && pubDate !== undefined) {
                            item.pubDate = parseDate(pubDate);
                        }

                        return item;
                    })
                )
            )
        ).map((i) => i as DataItem);

        const data: Data = {
            title: feedTitle,
            link: baseURL,
            description: feedDescription,
            item: dataItems,
            language: 'id',
            image: imageURL,
            allowEmpty: false,
            ttl: 60 * 12,
        };

        return data;
    },
};
