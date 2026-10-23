import { Center, Loader } from '@mantine/core';
import React from 'react';

export const LoadingIndicator: React.FC = () => (
  <Center h="calc(100vh - 108px)">
    <Loader role="progressbar" />
  </Center>
);
