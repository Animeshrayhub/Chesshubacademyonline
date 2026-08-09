import React from 'react';

// Piece image URLs from the raw github repository of Chess.com Neo theme
const pieceUrls: Record<string, string> = {
  wP: 'https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/pieces/neo/wp.png',
  wN: 'https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/pieces/neo/wn.png',
  wB: 'https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/pieces/neo/wb.png',
  wR: 'https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/pieces/neo/wr.png',
  wQ: 'https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/pieces/neo/wq.png',
  wK: 'https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/pieces/neo/wk.png',
  bP: 'https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/pieces/neo/bp.png',
  bN: 'https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/pieces/neo/bn.png',
  bB: 'https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/pieces/neo/bb.png',
  bR: 'https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/pieces/neo/br.png',
  bQ: 'https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/pieces/neo/bq.png',
  bK: 'https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/pieces/neo/bk.png',
};

// Create a component for each piece
const makePiece = (code: string) => {
  const Component = (props: any) => (
    <img
      src={pieceUrls[code]}
      alt={code}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        filter: 'drop-shadow(0px 2.5px 2px rgba(0, 0, 0, 0.45))',
        ...(props?.svgStyle || {}),
      }}
      draggable={false}
    />
  );
  Component.displayName = `ChessPiece_${code}`;
  return Component;
};

export const customChessPieces = {
  wP: makePiece('wP'),
  bP: makePiece('bP'),
  wR: makePiece('wR'),
  bR: makePiece('bR'),
  wB: makePiece('wB'),
  bB: makePiece('bB'),
  wN: makePiece('wN'),
  bN: makePiece('bN'),
  wQ: makePiece('wQ'),
  bQ: makePiece('bQ'),
  wK: makePiece('wK'),
  bK: makePiece('bK'),
};
