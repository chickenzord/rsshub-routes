import { Route, ViewType, Data, DataItem } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseRelativeDate } from '@/utils/parse-date';
import { load } from 'cheerio';

const feedTitle = 'Tempo.co News';
const feedDescriptionTpl = 'Most popular news in {channel}';
const baseURL = 'https://www.tempo.co';

export const route: Route = {
    path: '/news/popular/:channel?',
    categories: ['new-media'],
    view: ViewType.Articles,
    example: '/tempoco/news/popular/nasional',
    parameters: {
        channel: 'News channel name',
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['tempo.co/terpopuler/', 'www.tempo.co/terpopuler/'],
        },
    ],
    name: 'Tempo.co Popular News',
    maintainers: ['akhy'],
    url: 'www.tempo.co/terpopuler',
    handler: async (ctx) => {
        const { channel = '' } = ctx.req.param();
        const channelDescription = channel === '' ? `all channels` : `${channel} channel`;
        const fullURL = `${baseURL}/terpopuler?tipe=1hari&kanal=${channel}`;
        const response = await ofetch(fullURL);
        const $ = load(response);

        const imageURL = $('div.logo img').first().attr('src');

        const list = $('article')
            .parent()
            .toArray()
            .map((i) => {
                const item = $(i);
                const itemTitle = item.find('h2.title a').first();
                const itemPubDate = item.find('h4.date').first();
                const itemImage = item.find('img').first();
                const itemDescription = item.find('article p').first();
                const img = `<img src="${itemImage}"/><br/>`;

                const result: DataItem = {
                    title: itemTitle.text(),
                    link: itemTitle.attr('href') || '',
                    description: img + itemDescription.text(),
                    image: itemImage.attr('src'),
                    pubDate: parseRelativeDate(itemPubDate.text().replace(' jam lalu', ' hours ago')),
                    language: 'id',
                };

                return result;
            });

        const dataItems = (
            await Promise.all(
                list.map((item) =>
                    cache.tryGet(item.link!, async () => {
                        const response = await ofetch(item.link!);
                        const $ = load(response);

                        const img = `<img src="${item.image}"/><br/>`;

                        const content = $('.detail-konten').first();
                        if (content !== null && !content.is(':empty')) {
                            item.description = img + content.html() || '';
                        }

                        const author = $('span[itemprop="author"]').first();
                        if (author !== null && !author.is(':empty')) {
                            item.author = author.text();
                        }

                        return item;
                    })
                )
            )
        ).map((r) => r as DataItem);

        const data: Data = {
            title: `${feedTitle} - ${channelDescription}`,
            link: fullURL,
            description: feedDescriptionTpl.replace('{channel}', channelDescription),
            item: dataItems,
            language: 'id',
            image: imageURL,
            allowEmpty: false,
            ttl: 60,
        };

        return data;
    },
};
