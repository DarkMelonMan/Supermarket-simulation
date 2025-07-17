import React, { useState, useEffect, useRef } from 'react';
import './Simulation.css';

class Product {
  constructor(x, y, cost, ID, stall, attractive) {
    this.x = x;
    this.y = y;
    this.cost = cost;
    this.ID = ID;
    this.stall = stall;
    this.size = 6;
    this.attractive = attractive;
    if (attractive > 0) this.color = '#30b705';
    else this.color = '#7FFFD4';
  }
  
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  checkNearby() {
    const productsNearby = [];
    const productIndex = this.stall.products.indexOf(this);
    if (productIndex > 0) productsNearby.push(this.stall.products[productIndex - 1]);
    if (productIndex < this.stall.products.length - 1) productsNearby.push(this.stall.products[productIndex + 1]);
    return productsNearby;
  }

  getTooltipText() {
    return 'Цена: ' + this.cost.toFixed(2) + '\nID номер: ' + this.ID + '\nПривлекательность: ' + Math.floor(this.attractive) + '%';
  }
}

class Stall {
  constructor(x, y, width, height, ID) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.ID = ID;
    this.color = '#1E90FF';
    this.products = [];
    this.productsToRestock = [];
  }
  
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fill();
  }
  
  calculateDistanceToStall(x, y) {
    return Math.min(
      calculateDistance(x, y, this.x, this.y),
      calculateDistance(x, y, this.x, this.y + this.height),
      calculateDistance(x, y, this.x + this.width, this.y),
      calculateDistance(x, y, this.x + this.width, this.y + this.height)
    );
  }
  getTooltipText() {
    return 'Количество товаров: ' + this.products.length;
  }
}

class Cashier {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = '#FF6347';
    this.queue = [];
    this.processingTime = 0;
    this.totalRevenue = 0;
    this.customersProcessed = 0;
  }
  
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fill();
    
    // Отрисовка очереди
    ctx.fillStyle = 'rgba(255, 99, 71, 0.5)';
    for (let i = 0; i < this.queue.length; i++) {
      ctx.beginPath();
      ctx.arc(this.x - 20, this.y + this.height - (i + 1) * 20, this.queue[0].size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  processCustomer(time) {
    if (this.queue.length > 0) {
      this.processingTime++;
      if (this.processingTime > time) {
        const customer = this.queue.shift();
        let total = 0;
        customer.productsTaken.forEach(product => {
          total += product.cost;
        });
        this.totalRevenue += total;
        this.customersProcessed++;
        this.processingTime = 0;
        return customer;
      }
    }
    return null;
  }

  getTooltipText() {
    return 'Выручка: ' + this.totalRevenue.toFixed(2) + '\nОбслужено посетителей: ' + this.customersProcessed + '\nДлина очереди: ' + this.queue.length;
  }
}

class Human {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.targetX = x;
    this.targetY = y;
    this.size = 6;
    this.direction = Math.PI / 2;
    this.bypassingXRect = null;
    this.bypassingYRect = null;
    this.color = '#FF8C00';
    this.left = false;
  }
  
  move(width, height, stalls, humans, cashiers) {
  const dx = this.bypassingYRect || this.bypassingXRect? 0 : this.targetX - this.x;
  const dy = this.bypassingYRect || this.bypassingXRect? 0 : this.targetY - this.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0 || this.bypassingYRect || this.bypassingXRect) {
    // Получаем силу избегания
    const avoidanceForce = this.avoidObstacles(stalls, humans, cashiers);
    
    // Комбинируем основное направление и силу избегания
    const combinedDx = dx + avoidanceForce[0] * 1.5;
    const combinedDy = dy + avoidanceForce[1] * 1.5;
    const combinedDistance = Math.sqrt(combinedDx * combinedDx + combinedDy * combinedDy);
    
    if (combinedDistance > 0) {
      this.direction = Math.atan2(combinedDy, combinedDx);
      this.x += this.speed * Math.cos(this.direction);
      this.y += this.speed * Math.sin(this.direction);
    }

    // Границы области
    this.x = Math.max(this.size, Math.min(width - this.size, this.x));
    this.y = Math.max(this.size, Math.min(height - this.size, this.y));
  }
}
  
  avoidObstacles(stalls, humans, cashiers) {
  let avoidanceForceX = 0;
  let avoidanceForceY = 0;
  const personalSpace = this.size * 2;

  // Избегание других покупателей
  for (const otherHuman of humans) {
    if (otherHuman !== this && otherHuman !== null) {
      const distToHuman = calculateDistance(this.x, this.y, otherHuman.x, otherHuman.y);
      if (distToHuman < personalSpace) {
        const forceMagnitude = (personalSpace - distToHuman) * 0.5;
        avoidanceForceX += forceMagnitude * (this.x - otherHuman.x) / distToHuman;
        avoidanceForceY += forceMagnitude * (this.y - otherHuman.y) / distToHuman;
      }
    }
  }

  if (this.bypassingYRect) {
    const distToTop = Math.abs(this.y - (this.bypassingYRect.y - personalSpace * 2));
    const distToBottom = Math.abs(this.y - (this.bypassingYRect.y + this.bypassingYRect.height + personalSpace * 2));
    avoidanceForceY += distToTop < distToBottom ? -this.speed : this.speed;
    if (distToTop < this.size || distToBottom < this.size){
      avoidanceForceY = 0;
      avoidanceForceX = this.x > this.targetX ? -this.speed : this.speed; 
    }
    if (!this.isBehindRect(this.bypassingYRect)){
      this.bypassingYRect = null;
    }
  }
  else if (this.bypassingXRect) {
    const distToLeft = Math.abs(this.targetX - (this.bypassingXRect.x - personalSpace * 2));
    const distToRight = Math.abs(this.targetX - (this.bypassingXRect.x + this.bypassingXRect.width + personalSpace * 2));
    avoidanceForceX += distToLeft < distToRight ? -this.speed : this.speed;
    if (distToLeft < this.size * 2 || distToRight < this.size * 2){
      avoidanceForceX = 0;
      avoidanceForceY = this.y > this.targetY ? -this.speed : this.speed; 
    }
    if (!this.isAtSideRect(this.bypassingXRect)){
      this.bypassingXRect = null;
    }
  }
  // Проверяем, находится ли цель за прилавком
  else if (this.targetX && this.targetY) {
    for (const stall of stalls) {
      // Если цель находится за этим прилавком
      if (this.isBehindRect(stall)) {
        this.bypassingYRect = stall;
        break;
      }
      if (this.isAtSideRect(stall)) {
        this.bypassingXRect = stall;
        break;
      }
    }
    for (const cashier of cashiers) {
      if (this.isBehindRect(cashier)) {
        this.bypassingYRect = cashier;
        break;
      }
      if (this.isAtSideRect(cashier)) {
        this.bypassingXRect = cashier;
        break;
      }
    }
  }

  return [avoidanceForceX, avoidanceForceY];
}

isBehindRect(rect) {
  const isBehindX = (this.x - this.size * 2 < rect.x && this.targetX > rect.x + rect.width) ||
                   (this.x > rect.x + rect.width - this.size * 2 && this.targetX < rect.x);
  const isInFrontOfRect = this.y >= rect.y - this.size * 4 && this.y <= rect.y + rect.height + this.size * 4;
  
  return isBehindX && isInFrontOfRect;
}

isAtSideRect(rect) {
  const isAtSideY = (this.y - this.size * 2 < rect.y && this.targetY > rect.y + rect.height) ||
                   (this.y > rect.y + rect.height - this.size * 2 && this.targetY < rect.y);
  const isAtSideX = this.x >= rect.x - this.size * 4 && this.x <= rect.x + rect.width + this.size * 4;
  return isAtSideX && isAtSideY;
}
  
  findNearestStall(stalls) {
    if (!stalls || stalls.length === 0) return null;
    
    let nearestStall = null;
    let shortestDistance = Infinity;
    
    for (const stall of stalls) {
      const distance = stall.calculateDistanceToStall(this.x, this.y);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestStall = stall;
      }
    }
    
    return nearestStall;
  }
  
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(
      this.x + Math.cos(this.direction) * this.size/2,
      this.y + Math.sin(this.direction) * this.size/2,
      this.size/3, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
  }
}

class Customer extends Human {
  constructor(x, y, speed, productsAmountToBuy, productsCount) {
    super(x, y, speed);
    this.color = '#FF8C00';
    this.uselessProductsCount = 0;
    this.productsToBuy = [];
    this.productsTaken = [];
    this.checkedStallsIDs = [];
    this.state = 'shopping'; // 'shopping', 'goingToCashier', 'leaving', 'inQueue'
    this.timeSpent = 0;
    this.totalSpent = 0;
    this.currentProductTarget = null;
    this.nearestStallData = [];
    this.bestCashier = null;
    
    for (let i = 0; i < productsAmountToBuy; i++) {
      let newProductID = 0;
      while (newProductID === 0 || this.productsToBuy.includes(newProductID))
        newProductID = Math.floor(Math.random() * (productsCount - 1) + 1.1);
      this.productsToBuy.push(newProductID);
    }
  }
  findNearestStallToCheck(stalls) {
    const nearestStall = super.findNearestStall(stalls);
    const nearestStallData = [nearestStall];
    
    if (nearestStall != null && !this.checkedStallsIDs.includes(nearestStall.ID)) {
      if (Math.abs(this.x - nearestStall.x) < Math.abs(this.x - nearestStall.x - nearestStall.width)) 
        nearestStallData.push(nearestStall.x - this.size * 2);
      else 
        nearestStallData.push(nearestStall.x + nearestStall.width + this.size * 2);
      nearestStallData.push(nearestStall.y + Math.random() * nearestStall.height);
      return nearestStallData;
    } else if (stalls.length >= 1 && nearestStall != null) {
      let newStalls = stalls.filter(item => item.ID !== nearestStall.ID);
      return this.findNearestStallToCheck(newStalls);
    } else {
      return null;
    }
  }
  
  checkStalls(height, stalls, cashiers) {
    if (this.state === 'leaving' && height - this.y < this.size * 2) {
      this.left = true;
    }
    if (this.bypassingXRect || this.bypassingYRect || this.state === 'leaving') return;
    if (this.state === 'shopping') {
      // Если нет текущей цели, ищем новый прилавок
      if (!this.currentProductTarget) {
        if (this.nearestStallData.length === 0)
            this.nearestStallData = this.findNearestStallToCheck(stalls);
        else if (this.checkedStallsIDs.includes(this.nearestStallData[0].ID))
          this.nearestStallData = this.findNearestStallToCheck(stalls);
        let flag = true;
        if (this.productsTaken.length > 0) {
          const productsTakenIDS = [];
          for (const product of this.productsTaken) {
            productsTakenIDS.push(product.ID);
          }
          for (const product of this.productsToBuy) {
            if (!productsTakenIDS.includes(product))
              flag = false;
          }
        }
        else flag = false;
        if (!this.nearestStallData || flag) {
          // Нет больше прилавков для проверки или все товары уже куплены - идем на кассу
          this.goToCashier(cashiers);
          return;
        }
        
        const [nearestStall, targetX, targetY] = this.nearestStallData;
        this.targetX = targetX;
        this.targetY = targetY;
        this.currentStall = nearestStall;
      }

      // Проверяем расстояние до текущей цели
      const distance = calculateDistance(this.x, this.y, this.targetX, this.targetY);
      
      if (distance < this.size * 4) {
        // Достигли цели - либо прилавка, либо товара
        if (this.currentProductTarget) {
          // Берем товар
          this.takeProduct(this.currentProductTarget);
          this.currentProductTarget = null;
          
          // Проверяем, есть ли еще товары в этом прилавке
          const nextProduct = this.checkForProducts(this.currentStall)[0];
          if (nextProduct) {
            this.currentProductTarget = nextProduct;
            this.targetX = nextProduct.x > this.x ? nextProduct.x - this.size * 2 : nextProduct.x + this.size * 2;
            this.targetY = nextProduct.y;
          } else {
            // Товаров больше нет - отмечаем прилавк как проверенный
            this.checkedStallsIDs.push(this.currentStall.ID);
            this.currentStall = null;
          }
        } else {
          // Достигли прилавка - ищем товары
          const products = this.checkForProducts(this.currentStall);
          if (products.length > 0) {
            this.currentProductTarget = products[0];
            this.targetX = this.x < this.currentStall.x ? products[0].x - this.size * 2 : products[0].x + this.size * 2;
            this.targetY = products[0].y;
          } else {
            // Нет товаров - отмечаем прилавк как проверенный
            this.checkedStallsIDs.push(this.currentStall.ID);
            this.currentStall = null;
          }
        }
      }
    } else if (this.state === 'goingToCashier') {
      this.goToCashier(cashiers);
      const distance = calculateDistance(this.x, this.y, this.targetX, this.targetY);
      if (distance < this.size * 4) {
        this.state = 'inQueue';
        this.bestCashier.queue.push(this);
      }
    }
    else if (this.state === 'inQueue') this.timeSpent++;
  }
  
  goToCashier(cashiers) {
    if (cashiers.length === 0) {
      this.state = 'leaving';
      this.targetX = this.x;
      this.targetY = 700;
      return;
    }
    
    // Найти кассу с минимальной очередью
    let bestCashier = cashiers[0];
    if (this.bestCashier)
      bestCashier = this.bestCashier;
    for (const cashier of cashiers) {
      if (cashier.queue.length < bestCashier.queue.length) {
        bestCashier = cashier;
      }
    }
    
    this.targetX = bestCashier.x - this.size;
    this.targetY = bestCashier.y + bestCashier.height / 2;
    this.state = 'goingToCashier';
    this.bestCashier = bestCashier;
  }
  
  takeProduct(product) {
    
    this.productsTaken.push(product);
    this.totalSpent += product.cost;
    
    // Удаляем товар из прилавка
    const productIndex = product.stall.products.indexOf(product);
    if (productIndex !== -1) {
      product.stall.productsToRestock.push(product);
      product.stall.products.splice(productIndex, 1);
    }
    
    // Проверяем привлекательные соседние товары
    const nearbyProducts = product.checkNearby();
    for (const nearbyProduct of nearbyProducts) {
      if (Math.random() * 100 < nearbyProduct.attractive && !this.productsTaken.includes(nearbyProduct)) {
        this.uselessProductsCount++;
        this.productsTaken.push(nearbyProduct);
        this.totalSpent += nearbyProduct.cost;
        
        // Удаляем соседний товар
        const nearbyIndex = nearbyProduct.stall.products.indexOf(nearbyProduct);
        if (nearbyIndex !== -1) {
          nearbyProduct.stall.products.splice(nearbyIndex, 1);
        }
      }
    }
    
    return true;
  }
  
  checkForProducts(stall) {
    if (!stall) return [];
    
    let availableProducts = stall.products.filter(product => 
      this.productsToBuy.includes(product.ID) && 
      !this.productsTaken.includes(product)
    );
    
    // Сортируем по расстоянию до покупателя
    availableProducts = sortByDistance(this.x, this.y, availableProducts);
    
    return availableProducts;
  }
  
  leaveStore(height) {
    this.state = 'leaving';
    this.targetX = this.x;
    this.targetY = height;
  }
  
  draw(ctx) {
    if (this.state !== 'inQueue'){
      super.draw(ctx);
      
      // Отрисовка продуктовой корзины
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(this.x, this.y - 10, this.productsTaken.length, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  getTooltipText() {
    let text = 'Список покупок: ';
    for (const ID of this.productsToBuy) 
      text += '\n' + ID;
    text += '\nНайденные продукты: '
    for (const product of this.productsTaken) 
      text += '\n' + product.ID;
    text += '\nПредварительный чек: ' + this.totalSpent.toFixed(2);
    return text;
  }
}

class Manager extends Human {
  constructor(x, y, speed) {
    super(x, y, speed);
      this.color = '#5c0bb2';
      this.currentProductTarget = null;
      this.state = 'restocking';
  }

  isAnotherManagerTarget(product, managers) {
    for (const manager of managers) {
      if (manager !== this && manager.currentProductTarget === product)
        return true;
    }
    return false;
  }

  restockProducts(nearestProduct) {
    if (!nearestProduct && !this.currentProductTarget)
      return;
    if (!this.currentProductTarget)
      this.currentProductTarget = nearestProduct;
  
    const product = this.currentProductTarget;
    const closestX = product.x > this.x ? product.x - this.size * 2 : product.x + this.size * 2;
    this.targetX = closestX;
    this.targetY = product.y;
    const distance = calculateDistance(this.x, this.y, closestX, product.y);
    if (distance < this.size * 2) {
      let productIndex = product.ID - product.stall.products[0].ID;
      product.stall.products.splice(productIndex, 0, product);
      product.stall.productsToRestock = product.stall.productsToRestock.filter(p => p !== product);
      this.currentProductTarget = null;
    }
  }

  leaveStore() {
    this.targetX = this.x;
    this.targetY = 0;
    if (calculateDistance(this.x, this.y, this.targetX, this.targetY) < this.size * 2) {
      this.left = true;
    }
  }

  searchForProductsToRestock(stalls, managers) {
    if (this.state === 'restocking') {
      if (this.currentProductTarget) {
        this.restockProducts(null);
        return;
      }
      let nearestProduct = null;
      const nearestStall = super.findNearestStall(stalls);
      if (nearestStall && nearestStall.productsToRestock.length > 0) {
        const productsToRestock = sortByDistance(this.x, this.y, nearestStall.productsToRestock);
        let i = 0;
        while (!nearestProduct || this.isAnotherManagerTarget(nearestProduct, managers)) {
          nearestProduct = productsToRestock[i];
          i++;
          if (i >= productsToRestock.length)
            break;
        }
        this.restockProducts(nearestProduct);
      }
      else if (nearestStall) {
        const newStalls = stalls.filter(s => s !== nearestStall);
        this.searchForProductsToRestock(newStalls, managers);
      }
      else this.state = 'leaving';
    }
    else if (this.state === 'leaving')
      this.leaveStore();
  }

  getTooltipText() {
    if (this.currentProductTarget)
      return 'Пополняет товар: ' + this.currentProductTarget.ID;
    else return '';
  }
}

function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function sortByDistance(x, y, list) {
    list.sort((a, b) => 
      calculateDistance(x, y, a.x, a.y) - 
      calculateDistance(x, y, b.x, b.y)
    );
    return list;
  }

const Simulation = () => {
  const canvasRef = useRef(null);
  const stallsRef = useRef([]);
  const customersRef = useRef([]);
  const cashiersRef = useRef([]);
  const managersRef = useRef([]);
  const [tooltip, setTooltip] = useState(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    customersServed: 0,
    averageSpending: 0,
    uselessProductsSold: 0,
    activeCustomers: 0,
    activeManagers: 0
  });
  
  const [params, setParams] = useState({
    stallsCount: 5,
    width: 1200,
    height: 675,
    stallsWidth: 20,
    stallsHeight: 425,
    isRunning: true,
    customersCount: 5,
    speed: 1,
    cashiersCount: 2,
    spawnRate: 100,
    cashierProcessTime: 120
  });
  
  const [visibleCount, setVisibleCount] = useState(0);
  const spawnTimerRef = useRef(0);

  const initSimulation = () => {
    const newStalls = [];
    const newProducts = [];
    const newCustomers = [];
    const newCashiers = [];
    
    let distBetweenStalls = (params.width - params.stallsCount * params.stallsWidth) / (params.stallsCount - 1);
    
    for (let i = 0; i < params.stallsCount; i++) {
      if (params.stallsCount === 1) distBetweenStalls = 0;
      const newStall = new Stall(
        i * params.stallsWidth + i * distBetweenStalls,
        50,
        params.stallsWidth,
        params.stallsHeight,
        i + 1
      );
      newStalls.push(newStall);
      
      for (let j = 0; j < params.stallsHeight / 12; j++) {
        const newProduct = new Product(
          i * params.stallsWidth + i * distBetweenStalls + params.stallsWidth / 2,
          50 + j * 12 + 3,
          Math.random() * 100 + 10,
          (j + 1) + i * (Math.floor(params.stallsHeight / 12) + 1),
          newStall,
          Math.random() <= 0.25 ? 0 : Math.random() * 100
        );
        newStall.products.push(newProduct);
        newProducts.push(newProduct);
      }
    }
    
    const cashierWidth = 30;
    const cashierHeight = 50;
    const cashierSpacing = 50;
    const totalCashiersWidth = params.cashiersCount * cashierWidth + (params.cashiersCount - 1) * cashierSpacing;
    const startX = (params.width - totalCashiersWidth) / 2;
    
    for (let i = 0; i < params.cashiersCount; i++) {
      const newCashier = new Cashier(
        startX + i * (cashierWidth + cashierSpacing),
        params.height - 100,
        cashierWidth,
        cashierHeight
      );
      newCashiers.push(newCashier);
    }
    
    for (let i = 0; i < params.customersCount; i++) {
      newCustomers.push(new Customer(
        Math.random() * params.width,
        params.height - 6,
        params.speed,
        Math.floor(Math.random() * 3) + 1,
        newProducts.length,
      ));
    }
    
    customersRef.current = newCustomers;
    stallsRef.current = newStalls;
    cashiersRef.current = newCashiers;
    setVisibleCount(newProducts.length);
    spawnTimerRef.current = 0;
    managersRef.current = [];
    
    setStats({
      totalRevenue: 0,
      customersServed: 0,
      averageSpending: 0,
      uselessProductsSold: 0,
      activeCustomers: newCustomers.length,
      activeManagers: 0
    });
  };
  
  const handleParamChange = (e) => {
    const { name, value } = e.target;
    setParams(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let entity = null;

    for (const customer of customersRef.current) {
      const dx = customer.x - x;
      const dy = customer.y - y;

      if (Math.sqrt(dx*dx + dy*dy) < customer.size * 2) {
        entity = {type: 'customer', data: customer};
        break;
      }
    }

    if (!entity) {
      for (const manager of managersRef.current) {
        const dx = manager.x - x;
        const dy = manager.y - y;

        if (Math.sqrt(dx*dx + dy*dy) < manager.size * 2) {
          entity = {type: 'manager', data: manager};
          break;
        }
      }
    }

    if (!entity) {
      for (const stall of stallsRef.current) {
        for (const product of stall.products) {
          const dx = product.x - x;
          const dy = product.y - y;
          if (Math.sqrt(dx*dx + dy*dy) < product.size) {
            entity = {type: 'product', data: product};
            break;
          }
        }
        if (!entity) {
        if (x > stall.x && x < stall.x + stall.width && y > stall.y && y < stall.y + stall.height) {
          entity = {type: 'stall', data: stall};
          break;
        }
      }
    }
  }
    if (!entity) {
      for (const cashier of cashiersRef.current) {
        if (x > cashier.x && x < cashier.x + cashier.width && y > cashier.y && y < cashier.y + cashier.height) {
          entity = {type: 'cashier', data: cashier};
          break;
        }
      }
    }

    setTooltip(entity 
      ? {
        entity, 
        position: {x: e.clientX, y: e.clientY},
        text: entity.data.getTooltipText()
      } : null);
  }
  
  const toggleSimulation = () => {
    setParams(prev => ({
      ...prev,
      isRunning: !prev.isRunning
    }));
  };
  
  useEffect(() => {
    initSimulation();
  }, [params.stallsCount, params.cashiersCount]);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      
      // Обработка касс
      cashiersRef.current.forEach(cashier => {
        const finishedCustomer = cashier.processCustomer(params.cashierProcessTime);
        if (finishedCustomer) {
          finishedCustomer.leaveStore(params.height);
          setStats(prev => ({
            ...prev,
            totalRevenue: prev.totalRevenue + finishedCustomer.totalSpent,
            customersServed: prev.customersServed + 1,
            uselessProductsSold: prev.uselessProductsSold + finishedCustomer.uselessProductsCount,
            averageSpending: prev.customersServed > 0 ? 
              (prev.averageSpending * prev.customersServed + finishedCustomer.totalSpent) / (prev.customersServed + 1) : 
              finishedCustomer.totalSpent
          }));
        }
      });

      // Отрисовка прилавков и товаров
      stallsRef.current.forEach(p => {
        p.draw(ctx);
        p.products.forEach(pr => pr.draw(ctx));
      });
      
      // Отрисовка касс
      cashiersRef.current.forEach(c => c.draw(ctx));
      
      // Отрисовка и передвижение покупателей
      const currentHumans = customersRef.current.concat(managersRef.current);
      customersRef.current.forEach(c => {
        c.checkStalls(params.height,
          stallsRef.current, 
          cashiersRef.current
        );
        c.move(canvas.width, canvas.height, stallsRef.current, currentHumans, cashiersRef.current);
        c.draw(ctx);
      });

      // Отрисовка и передвижение менеджеров
      managersRef.current.forEach(m => {
        m.searchForProductsToRestock(stallsRef.current, managersRef.current);
        m.move(canvas.width, canvas.height, stallsRef.current, currentHumans, cashiersRef.current);
        m.draw(ctx);
      })

      customersRef.current = customersRef.current.filter(c => !c.left);
      managersRef.current = managersRef.current.filter(m => !m.left);

      let productCount = 0;
      const maxProductCount = Math.ceil(params.stallsHeight / 12) * params.stallsCount;
      stallsRef.current.forEach(stall => {
        productCount += stall.products.length;
      });
      setVisibleCount(productCount);
      
      if (productCount < maxProductCount) {
        const productsPerStall = maxProductCount / params.stallsCount;
        if (productCount < productsPerStall * (params.stallsCount - managersRef.current.length)) {
          managersRef.current.push(new Manager(Math.random() * params.width, 0, params.speed * 1.5));    
        }
      }

      if (params.isRunning) {
        spawnTimerRef.current++;
        if (spawnTimerRef.current > params.spawnRate && customersRef.current.length < 50) {
          const newCustomer = new Customer(
            Math.random() * params.width,
            params.height - 6,
            params.speed,
            Math.floor(Math.random() * 3) + 1,
            stallsRef.current.reduce((acc, stall) => acc + stall.products.length, 0),
            Math.random() * 2 + 1
          );
          customersRef.current.push(newCustomer);
          spawnTimerRef.current = 0;
        }
      }
      
      setStats(prev => ({
            ...prev,
            activeCustomers: customersRef.current.length,
            activeManagers: managersRef.current.length
          }));
      
      if (params.isRunning) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    if (params.isRunning) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      // Отрисовка текущего состояния во время паузы
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stallsRef.current.forEach(p => p.draw(ctx));
      stallsRef.current.forEach(p => p.products.forEach(pr => pr.draw(ctx)));
      cashiersRef.current.forEach(c => c.draw(ctx));
      customersRef.current.forEach(c => c.draw(ctx));
      managersRef.current.forEach(m => m.draw(ctx));
    }
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [params.isRunning, params.stallsHeight, params.stallsWidth, params.spawnRate, params.height, params.width, params.speed, params.stallsCount, params.cashierProcessTime]);
  
  return (
    <div className="simulation-container">
      <div className="controls">
        <h2>Управление симуляцией</h2>
        
        {tooltip && (
        <div 
          className="tooltip"
          style={{
            position: 'fixed',
            left: tooltip.position.x,
            top: tooltip.position.y,
            zIndex: 100
          }}
        >
          {tooltip.text.split('\n').map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        </div>
        )}
        
        <div className="control-group">
          <label>
            Количество отделов:
            <input
              type="range"
              name="stallsCount"
              min="1"
              max="10"
              value={params.stallsCount}
              onChange={handleParamChange}
            />
            {params.stallsCount}
          </label>
        </div>
        
        <div className="control-group">
          <label>
            Количество касс:
            <input
              type="range"
              name="cashiersCount"
              min="1"
              max="5"
              value={params.cashiersCount}
              onChange={handleParamChange}
            />
            {params.cashiersCount}
          </label>
        </div>
        
        <div className="control-group">
          <label>
            Скорость:
            <input
              type="range"
              name="speed"
              min="0.5"
              max="5"
              step="0.1"
              value={params.speed}
              onChange={handleParamChange}
            />
            {params.speed.toFixed(1)}
          </label>
        </div>
        
        <div className="control-group">
          <label>
            Частота появления:
            <input
              type="range"
              name="spawnRate"
              min="10"
              max="300"
              value={params.spawnRate}
              onChange={handleParamChange}
            />
            {params.spawnRate}
          </label>
        </div>

        <div className="control-group">
          <label>
            Время работы кассы:
            <input
              type="range"
              name="cashierProcessTime"
              min="30"
              max="300"
              value={params.cashierProcessTime}
              onChange={handleParamChange}
            />
            {params.cashierProcessTime}
          </label>
        </div>
        
        <div className="buttons">
          <button onClick={initSimulation}>Сбросить</button>
          <button onClick={toggleSimulation}>
            {params.isRunning ? 'Пауза' : 'Старт'}
          </button>
        </div>
        
        <div className="stats">
          <h3>Статистика магазина</h3>
          <p>Выручка: ${stats.totalRevenue.toFixed(2)}</p>
          <p>Обслужено покупателей: {stats.customersServed}</p>
          <p>Средний чек: ${stats.averageSpending.toFixed(2)}</p>
          <p>Ненужных товаров продано: {stats.uselessProductsSold}</p>
          <p>Покупателей в магазине: {stats.activeCustomers}</p>
          <p>Менеджеров в магазине: {stats.activeManagers}</p>
          <p>Товаров на полках: {visibleCount}</p>
        </div>
      </div>
      
      <div className="simulation-area">
        <canvas
          ref={canvasRef}
          width={params.width}
          height={params.height}
          onMouseMove={handleMouseMove}
          onMouseOut={() => setTooltip(null)}
        />
      </div>
    </div>
  );
};

export default Simulation;