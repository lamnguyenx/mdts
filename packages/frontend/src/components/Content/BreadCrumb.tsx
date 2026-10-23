import { Anchor, Breadcrumbs, Text } from '@mantine/core';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

const BreadCrumb: React.FC<BreadCrumbProps> = ({ onDirectorySelect }) => {
  const { currentPath } = useSelector((state: RootState) => state.history);

  const pathSegments = currentPath ? currentPath.split('/').filter(segment => segment !== '') : [];

  return (
    <Breadcrumbs mb="sm" aria-label="breadcrumb">
      {pathSegments.map((segment, index) => {
        const isLast = index === pathSegments.length - 1;
        const path = pathSegments.slice(0, index + 1).join('/');

        return isLast ? (
          <BreadCrumbText key={path} segment={segment} />
        ) : (
          <BreadCrumbLink key={path} path={path} segment={segment} onDirectorySelect={onDirectorySelect} />
        );
      })}
    </Breadcrumbs>
  );
};

export default BreadCrumb;

interface BreadCrumbLinkProps {
  path: string;
  segment: string;
  onDirectorySelect?: (directoryPath: string) => void;
}

const BreadCrumbLink: React.FC<BreadCrumbLinkProps> = ({ path, segment, onDirectorySelect }) => {
  const handleClick = useCallback(() => {
    if (onDirectorySelect) onDirectorySelect(path);
  }, [path, onDirectorySelect]);

  return <Anchor href="#" c="inherit" onClick={handleClick}>{segment}</Anchor>;
};

interface BreadCrumbTextProps {
  segment: string;
}

const BreadCrumbText: React.FC<BreadCrumbTextProps> = ({ segment }) =>
  <Text>{segment}</Text>;

interface BreadCrumbProps {
  onDirectorySelect?: (directoryPath: string) => void;
}
