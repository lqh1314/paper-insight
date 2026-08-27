import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import HomePage from './pages/HomePage/HomePage';
import PaperDetailPage from './pages/PaperDetailPage/PaperDetailPage';
import ComparePage from './pages/ComparePage/ComparePage';
import PptFullscreenPage from './pages/PptFullscreenPage/PptFullscreenPage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="paper/:id" element={<PaperDetailPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="ppt/:paperId/fullscreen" element={<PptFullscreenPage />} />
      </Route>
    </Routes>
  );
};

export default RoutesComponent;
