import { Center, Loader } from '@mantine/core';
import React from 'react';

export const LoadingIndicator: React.FC = () => (
  <Center h="calc(100vh - 148px)">
    <Loader role="progressbar" />
  </Center>
);
