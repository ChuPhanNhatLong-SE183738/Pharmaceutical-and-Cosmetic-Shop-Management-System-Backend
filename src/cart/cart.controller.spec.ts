// This file is just for testing authentication manually

import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Types } from 'mongoose';

// Create a simple mock for CartService
const mockCartService = {
  findByUserId: jest.fn(),
  // ...other methods...
};

// Create a mock for JwtAuthGuard
const mockJwtAuthGuard = {
  canActivate: jest.fn().mockImplementation((context) => {
    // Set req.user for testing purposes
    const req = context.switchToHttp().getRequest();
    req.user = { userId: '60d0fe4f5311236168a109ca' };
    return true;
  }),
};

describe('CartController', () => {
  let controller: CartController;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        { provide: CartService, useValue: mockCartService },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue(mockJwtAuthGuard)
    .compile();
    
    controller = module.get<CartController>(CartController);
  });
  
  it('should get my cart', async () => {
    // This test can help debug authentication issues
    const req = { user: { userId: '60d0fe4f5311236168a109ca' } };
    mockCartService.findByUserId.mockResolvedValue(null);
    
    const result = await controller.getMyCart(req);
    expect(result.success).toBe(true);
    expect(result.message).toBe('User has no cart yet');
  });
});
