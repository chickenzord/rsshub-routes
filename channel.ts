import { Route, ViewType, Data, DataItem } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

const feedTitle = 'Tempo.co';
const feedDescriptionTpl = 'Tempo.co news in {channel}';
const baseURL = 'https://www.tempo.co';

export const route: Route = {
    path: '/channel/:channel',
    categories: ['new-media'],
    view: ViewType.Articles,
    example: '/channel/plus',
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
    name: 'Tempo.co Channel',
    maintainers: ['akhy'],
    url: 'www.tempo.co',
    handler: async (ctx) => {
        const { channel = '' } = ctx.req.param();
        const channelDescription = `${channel} channel`;
        const fullURL = `${baseURL}/${channel}`;
        const response = await ofetch(fullURL);
        const $ = load(response);

        const imageURL = `${baseURL}/_ipx/w_272&f_webp/img/logo-tempo.svg`;

        const links = $('a')
            .toArray()
            .map((el) => $(el).attr('href'))
            .filter((href) => href && /^\/[a-z]+\/.+-\d+$/.test(href))
            .map((href) => href?.substring(1)) // strip leading slash
            .map((href) => `${baseURL}/${href}`);


        const dataItems = (await Promise.all([...new Set(links)]
            .map((link) =>
                cache.tryGet(link, async () => {
                    const response = await ofetch(link);
                    const $ = load(response);

                    const title = $('h1[class]');
                    const pubDate = $('p.text-sm');
                    const normalizedPubDate = pubDate
                        .text()
                        .replace(' WIB', '')
                        .replace(' | ', ' ')
                        .replace('.', ':')
                        .replaceAll('Januari', '01')
                        .replaceAll('Februari', '02')
                        .replaceAll('Maret', '03')
                        .replaceAll('April', '04')
                        .replaceAll('Mei', '05')
                        .replaceAll('Juni', '06')
                        .replaceAll('Juli', '07')
                        .replaceAll('Agustus', '08')
                        .replaceAll('September', '09')
                        .replaceAll('Oktober', '10')
                        .replaceAll('November', '11')
                        .replaceAll('Desember', '12')
                        .trim()
                        ;

                    const result: DataItem = {
                        title: title.text(),
                        link: link!,
                        language: 'id',
                        pubDate: timezone(parseDate(normalizedPubDate, 'D MM YYYY HH:mm'), +7),
                    };

                    return result;
                })
            ))).map((i) => i as DataItem) ;

        const data: Data = {
            title: `${feedTitle} - ${channelDescription}`,
            link: fullURL,
            description: feedDescriptionTpl.replace('{channel}', channelDescription),
            item: dataItems,
            language: 'id',
            image: imageURL,
            allowEmpty: false,
            ttl: 60 * 6, // 6 hours
        };

        return data;
    },
};
