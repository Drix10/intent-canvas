import { APP_CONFIG } from '../config';
import { CanvasEdge, CanvasNode } from '../types/canvas';

function center(node: CanvasNode) {
  return { x: node.position.x + node.position.width / 2, y: node.position.y + node.position.height / 2 };
}

function pairKey(sourceNodeId: string, targetNodeId: string) {
  return [sourceNodeId, targetNodeId].sort().join('|');
}

export function buildSpatialEdges(nodes: CanvasNode[], explicitEdges: CanvasEdge[]): CanvasEdge[] {
  const nodeIds = new Set(nodes.map(node => node.id));
  const relations = explicitEdges.filter(edge => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId));
  const existingPairs = new Set(relations.map(edge => pairKey(edge.sourceNodeId, edge.targetNodeId)));

  for (let sourceIndex = 0; sourceIndex < nodes.length; sourceIndex += 1) {
    for (let targetIndex = sourceIndex + 1; targetIndex < nodes.length; targetIndex += 1) {
      const source = nodes[sourceIndex];
      const target = nodes[targetIndex];
      const sourceCenter = center(source);
      const targetCenter = center(target);
      const distancePixels = Math.round(Math.hypot(targetCenter.x - sourceCenter.x, targetCenter.y - sourceCenter.y));
      const relationKey = pairKey(source.id, target.id);
      if (distancePixels <= APP_CONFIG.proximityDistancePixels && !existingPairs.has(relationKey)) {
        relations.push({
          id: `proximity-${source.id}-${target.id}`,
          sourceNodeId: source.id,
          targetNodeId: target.id,
          relationType: 'spatial_proximity',
          label: `Proximity ${distancePixels}px`,
          distancePixels,
        });
        existingPairs.add(relationKey);
      }
    }
  }

  return relations;
}

export function buildSpatialClusters(nodes: CanvasNode[], edges: CanvasEdge[], clusterIdPrefix = 'cluster') {
  const nodeIds = new Set(nodes.map(node => node.id));
  const adjacency = new Map(nodes.map(node => [node.id, new Set<string>()]));
  edges.forEach(edge => {
    if (nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)) {
      adjacency.get(edge.sourceNodeId)?.add(edge.targetNodeId);
      adjacency.get(edge.targetNodeId)?.add(edge.sourceNodeId);
    }
  });

  const visited = new Set<string>();
  return nodes.flatMap(node => {
    if (visited.has(node.id)) return [];
    const component: CanvasNode[] = [];
    const queue = [node.id];
    visited.add(node.id);
    while (queue.length) {
      const currentId = queue.shift();
      const current = nodes.find(candidate => candidate.id === currentId);
      if (!current) continue;
      component.push(current);
      adjacency.get(current.id)?.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      });
    }
    const bounds = component.reduce((result, current) => ({
      minX: Math.min(result.minX, current.position.x),
      minY: Math.min(result.minY, current.position.y),
      maxX: Math.max(result.maxX, current.position.x + current.position.width),
      maxY: Math.max(result.maxY, current.position.y + current.position.height),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    return [{ clusterId: `${clusterIdPrefix}-${component[0].id}`, nodeIds: component.map(current => current.id), boundingBox: bounds }];
  });
}
