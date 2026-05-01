import { Project } from '../types';

export const PROJECTS: Project[] = [
  {
    id: 0,
    name: '川普下台',
    options: ['下台', '继续呆着'],
    endDate: '2025-12-25',
    description: '预测川普是否会在2025年圣诞节前下台',
    image: '/trump.png',
  },
  {
    id: 1,
    name: 'cuteMarket赢今晚比赛',
    options: ['赢', '输'],
    endDate: '2025-11-16',
    description: 'cuteMarket 队伍今晚的比赛结果预测',
    image: '/cuteMarket.png',
  },
  {
    id: 2,
    name: '比特币突破100万',
    options: ['突破', '未突破'],
    endDate: '2025-12-31',
    description: '比特币是否会在2025年底前突破100万美元',
    image: '/生成金融景观图片.png',
  },
  {
    id: 3,
    name: '诺奖得主地区',
    options: ['亚洲', '欧洲', '其他'],
    endDate: '2026-10-10',
    description: '2025年诺贝尔奖得主来自哪个地区',
  },
  {
    id: 4,
    name: '2026世界杯冠军',
    options: ['巴西', '阿根廷', '法国', '其他'],
    endDate: '2026-07-19',
    description: '预测2026年世界杯的冠军队伍',
    image: '/fifa2026.png ',
  },
];

