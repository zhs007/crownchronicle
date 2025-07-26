import { NextRequest, NextResponse } from 'next/server';
import { SaveManager } from '@/lib/saveManager';



// GET /api/saves/[saveId] - 加载存档
export async function GET(request: NextRequest) {
  const segments = request.nextUrl.pathname.split('/');
  const saveId = segments[segments.length - 1];
  try {
    
    const saveFile = await SaveManager.loadSave(saveId);
    if (!saveFile) {
      return NextResponse.json({
        success: false,
        error: '存档不存在',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        gameState: saveFile.gameState
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to load save:', error);
    return NextResponse.json({
      success: false,
      error: '加载存档失败',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PUT /api/saves/[saveId] - 保存游戏
export async function PUT(request: NextRequest) {
  const segments = request.nextUrl.pathname.split('/');
  const saveId = segments[segments.length - 1];
  try {
    const body = await request.json();
    const { gameState, playTime = 0 } = body;

    if (!gameState) {
      return NextResponse.json({
        success: false,
        error: '游戏状态不能为空',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const success = await SaveManager.updateSave(saveId, gameState, playTime);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '保存失败',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to save game:', error);
    return NextResponse.json({
      success: false,
      error: '保存游戏失败',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// DELETE /api/saves/[saveId] - 删除存档
export async function DELETE(request: NextRequest) {
  const segments = request.nextUrl.pathname.split('/');
  const saveId = segments[segments.length - 1];
  try {
    
    const success = await SaveManager.deleteSave(saveId);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '删除失败',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to delete save:', error);
    return NextResponse.json({
      success: false,
      error: '删除存档失败',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
