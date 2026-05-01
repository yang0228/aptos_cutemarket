import { Project, ProjectStatus } from '../types';

export function getProjectStatus(project: Project): ProjectStatus {
  const now = new Date();
  const endDate = new Date(project.endDate);
  
  if (now > endDate) {
    // 已过结束时间，待结算（暂时没有结算功能）
    return ProjectStatus.Closed;
  }
  
  return ProjectStatus.Open;
}

export function getStatusText(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.Open:
      return '开放中';
    case ProjectStatus.Closed:
      return '已关闭';
    case ProjectStatus.Settled:
      return '已开奖';
    default:
      return '未知';
  }
}

export function getStatusColor(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.Open:
      return 'bg-green-500';
    case ProjectStatus.Closed:
      return 'bg-yellow-500';
    case ProjectStatus.Settled:
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
}

