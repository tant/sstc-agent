# Behind-the-Scenes Specialist Coordination

## Overview

Mai agent now coordinates with hardware specialists behind the scenes without revealing this to customers. This approach provides a seamless customer experience while leveraging specialized knowledge from individual experts.

## How It Works

### 1. Customer Interaction Flow

```
Customer → Mai Agent → (Silently coordinate with relevant specialists) → Integrated Response
```

### 2. Specialist Coordination Process

1. **Message Analysis**: Mai analyzes customer message to identify relevant specialists
2. **Behind-the-Scenes Coordination**: Mai silently requests information from identified specialists
3. **Data Integration**: Mai combines specialist data with customer context
4. **Response Generation**: Mai generates natural response without mentioning specialists

### 3. Key Benefits

- **Seamless Experience**: Customers interact with one agent (Mai) throughout
- **Expert Knowledge**: Access to specialized knowledge from individual experts
- **Natural Language**: Responses feel like they come from Mai's own knowledge
- **No Confusion**: Customers don't get confused by multiple voices

## Supported Specialists

### 1. CPU Specialist
- **Expertise**: CPU processors (Intel, AMD)
- **Keywords**: "cpu", "bộ xử lý", "intel", "amd"
- **Capabilities**: Technical analysis, compatibility checking, recommendations

### 2. RAM Specialist
- **Expertise**: Memory modules (DDR4, DDR5)
- **Keywords**: "ram", "bộ nhớ", "memory"
- **Capabilities**: Capacity planning, speed optimization, compatibility

### 3. SSD Specialist
- **Expertise**: Solid State Drives (SATA, NVMe)
- **Keywords**: "ssd", "ổ cứng", "storage"
- **Capabilities**: Performance analysis, interface compatibility, pricing

### 4. Barebone Specialist
- **Expertise**: Computer cases (mini-tower, mid-tower, full-tower)
- **Keywords**: "case", "barebone", "vỏ máy"
- **Capabilities**: Form factor analysis, cooling compatibility, aesthetics

### 5. Desktop Specialist
- **Expertise**: Complete PC builds
- **Keywords**: "pc", "máy tính", "desktop"
- **Capabilities**: System integration, component compatibility, budget optimization

## Implementation Details

### 1. Coordinator Logic (Mai Agent)

```typescript
// Identify relevant specialists based on customer message
private identifyRelevantSpecialists(message: string): Specialist[] {
  const keywords = message.toLowerCase().split(' ');
  const specialists: Specialist[] = [];
  
  if (keywords.some(k => ['cpu', 'bộ xử lý'].includes(k))) {
    specialists.push(cpuSpecialist);
  }
  
  if (keywords.some(k => ['ram', 'bộ nhớ'].includes(k))) {
    specialists.push(ramSpecialist);
  }
  
  if (keywords.some(k => ['ssd', 'ổ cứng'].includes(k))) {
    specialists.push(ssdSpecialist);
  }
  
  if (keywords.some(k => ['case', 'barebone'].includes(k))) {
    specialists.push(bareboneSpecialist);
  }
  
  if (keywords.some(k => ['pc', 'máy tính'].includes(k))) {
    specialists.push(desktopSpecialist);
  }
  
  return specialists;
}
```

### 2. Silent Coordination

```typescript
// Coordinate with specialists without telling customer
private async coordinateWithSpecialists(
  specialists: Specialist[],
  customerMessage: string
): Promise<SpecialistData[]> {
  const promises = specialists.map(specialist => 
    specialist.generate(customerMessage, {})
      .catch(error => {
        console.warn(`Specialist coordination failed:`, error);
        return null;
      })
  );
  
  const results = await Promise.all(promises);
  return results.filter(result => result !== null);
}
```

### 3. Response Integration

```typescript
// Integrate specialist data into natural response
private integrateSpecialistData(
  customerMessage: string,
  specialistData: SpecialistData[]
): string {
  // Generate response that feels natural and doesn't mention specialists
  let response = `Dạ quý khách, em vừa nhận được thông tin chi tiết từ hệ thống SSTC...\n\n`;
  
  // Add relevant product recommendations
  specialistData.forEach(data => {
    response += this.formatProductRecommendations(data);
  });
  
  // Add helpful guidance
  response += `\nQuý khách quan tâm đến mẫu nào trong số này, hay có yêu cầu đặc biệt nào?`;
  
  return response;
}
```

## Best Practices

### 1. Natural Language
- Never mention "specialist" or "expert" to customers
- Use phrases like "em vừa nhận được thông tin từ hệ thống SSTC"
- Maintain consistent tone and personality

### 2. Accurate Information
- Only present products that exist in the database
- Use exact product names, SKUs, and prices
- Verify compatibility before recommending

### 3. Helpful Guidance
- Ask follow-up questions to refine recommendations
- Provide context-appropriate explanations
- Guide customers toward decisions

### 4. Error Handling
- Gracefully handle specialist unavailability
- Provide fallback responses when needed
- Maintain positive customer experience

## Example Interactions

### Before (Explicit Specialist Mention)
```
Customer: "Tôi muốn mua case máy tính"
Mai: "Dạ quý khách, em xin phép chuyển quý khách sang chuyên gia barebone..."
```

### After (Behind-the-Scenes Coordination)
```
Customer: "Tôi muốn mua case máy tính"
Mai: "Dạ quý khách, em vừa nhận được thông tin chi tiết từ hệ thống SSTC. Dưới đây là một số mẫu case phù hợp với nhu cầu của quý khách:"
```

## Testing Strategy

### 1. Unit Tests
- Verify specialist identification logic
- Test silent coordination mechanism
- Validate response integration

### 2. Integration Tests
- End-to-end customer interaction flows
- Multi-specialist coordination scenarios
- Error handling and fallback mechanisms

### 3. Regression Tests
- Ensure no fictional product creation
- Verify accurate product information
- Confirm natural language responses

## Future Enhancements

### 1. Advanced Coordination
- Priority-based specialist selection
- Conflict resolution between specialists
- Real-time data synchronization

### 2. Improved Integration
- Better data merging algorithms
- Enhanced personalization
- Context-aware recommendations

### 3. Performance Optimization
- Caching mechanisms
- Parallel processing improvements
- Response time optimization