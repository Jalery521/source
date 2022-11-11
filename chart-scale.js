// 比如传入1.33342  格式化为13记录乘幂-1
// 传入30  格式化为30 记录乘幂0
// 传入300000  格式化为30 记录乘幂4
// 传入0.0000445 格式化为45 记录乘幂-6
/**
 * 对传入值格式话并记录转化的10的乘幂
 * @param {Number} number 需格式化正数值
 * @returns {Number} formatNumber 格式化后数值
 * @returns {Number} power 10的乘幂
 */
export function formatNumInteger(number) {
  let power = 0
  let formatNumber = number
  while (formatNumber < 10) {
    formatNumber *= 10
    power--
  }
  while (formatNumber > 100) {
    formatNumber /= 10
    power++
  }
  // 判断是有仍有小数
  if (formatNumber % 1 !== 0) {
    formatNumber *= 10
    formatNumber = Math.ceil(formatNumber)
    power--
  }
  return {
    formatNumber,
    power,
  }
}

const magic = [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100] //魔数数组经过扩充，放宽魔数限制避免出现取不到魔数的情况。

/**
 * 以下刻度计算实现参考 https://www.jb51.net/article/251732.htm,使用BigNumber.js保证计算中精度
 * @param {Number} maxValue 最大值
 * @param {Number} minValue 最小值
 * @param {Number} splitNumber 刻度区间数量
 * @returns {Number} max 最大刻度
 * @returns {Number} min 最小刻度
 * @returns {Number} intervel 刻度间隔
 */
export function getMaxMinInterval(maxValue, minValue, splitNumber) {
  maxValue = maxValue || 0
  minValue = minValue || 0
  if (maxValue === minValue) {
    // 如果都为0则不进行计算直接返回
    if (maxValue === 0) {
      return {
        max: maxValue,
        min: minValue,
        interval: 0,
      }
    } else {
      // 此处要区分值如果小于0则互换max和min
      if (maxValue > 0) {
        minValue = 0
      } else {
        minValue = maxValue
        maxValue = 0
      }
    }
  }
  splitNumber = splitNumber || 6
  maxValue = BigNumber(maxValue)
  minValue = BigNumber(minValue)

  //计算出初始间隔tempGap和缩放比例multiple
  let { formatNumber, power } = formatNumInteger(
    maxValue.minus(minValue).toNumber()
  )
  const remainder = formatNumber % splitNumber
  if (remainder !== 0) {
    formatNumber = BigNumber(formatNumber).plus(splitNumber).minus(remainder)
  }
  formatNumber = BigNumber(10).pow(power).times(formatNumber)
  const tempGap = formatNumber.div(splitNumber) //初始刻度间隔的大小。
  //设tempGap除以multiple后刚刚处于魔数区间内，先求multiple的幂10指数，例如当tempGap为120，想要把tempGap映射到魔数数组（即处理为10到100之间的数），则倍数为10，即10的1次方。
  let multiple = Math.floor(Math.log10(tempGap.toNumber()) - 1) //这里使用Math.floor的原因是，当Math.log10(tempGap)-1无论是正负数都需要向下取整。不能使用parseInt或其他取整逻辑代替。
  //刚才是求出指数，这里求出multiple的实际值。分开两行代码避免有人看不懂
  multiple = BigNumber(10).pow(multiple) // 解决Math.pow(10,-4)得到0.00009999999999999999的问题
  //取出邻近较大的魔数执行第一次计算
  // const tempStep = tempGap / multiple
  const tempStep = tempGap.div(multiple) //映射后的间隔大小

  let estep //期望得到的间隔

  let lastIndex = -1 //记录上一次取到的魔数下标，避免出现死循环

  let i = 0
  for (; i < magic.length; i++) {
    // if(tempStep < magic[i])
    if (tempStep.comparedTo(magic[i]) === -1) {
      // estep = magic[i]*multiple
      estep = multiple.times(magic[i]) //取出第一个大于tempStep的魔数，并乘以multiple作为期望得到的最佳间隔
      break
    }
  }

  //求出期望的最大刻度和最小刻度，为estep的整数倍
  let max, min

  function countDegree(estep) {
    //这里的parseInt是我无意中写出来的，本来我是想对maxi使用Math.floor，对mini使用Math.ceil的。这样能向下取到邻近的一格，不过后面发现用parseInt好像画出来图的比较好看
    // if(maxValue===0) max = 0
    // max = parseInt(maxValue/estep+1) * estep
    max =
      maxValue.comparedTo(0) === 0
        ? BigNumber(0)
        : estep.times(parseInt(maxValue.div(estep).plus(1).toNumber())) //最终效果是当max/estep属于(-1,Infinity)区间时，向上取1格，否则取2格。
    // min = parseInt(minValue/estep-1) * estep
    min =
      minValue.comparedTo(0) === 0
        ? BigNumber(0)
        : estep.times(parseInt(minValue.div(estep).minus(1).toNumber())) //当min/estep属于(-Infinity,1)区间时，向下取1格，否则取2格。
    //如果max和min刚好在刻度线的话，则按照上面的逻辑会向上或向下多取一格
  }

  countDegree(estep)

  //当0刻度不在刻度线上时，重新取魔数进行计算//确保其中一条分割线刚好在0刻度上。
  // 如果最大刻度为0或者最小刻度为0,计算根据当前间隔得到的最大值/最小值是否大于/小于最大值/最小值
  if (max.comparedTo(0) === 0) {
    // 如果最大值为0,那么最小值=-间隔*splitNumber
    const shouldMin = estep.times(-splitNumber)
    if (min.comparedTo(shouldMin) === -1) {
      return getMaxMinInterval(0, min.toNumber(), splitNumber)
    } else {
      min = shouldMin
    }
  } else if (min.comparedTo(0) === 0) {
    const shouldMax = estep.times(splitNumber)
    if (max.comparedTo(shouldMax) === 1) {
      return getMaxMinInterval(max.toNumber(), 0, splitNumber)
    } else {
      max = shouldMax
    }
    // 如果最大刻度和最小刻度都不为0
  } else {
    let tempSplitNumber

    outter: do {
      //计算模拟的实际分段数
      // tempSplitNumber = Math.round((max-min)/estep)
      tempSplitNumber = Math.round(max.minus(min).div(estep).toNumber())
      //当趋势单调性发生变化时可能出现死循环，需要进行校正
      if ((i - lastIndex) * (tempSplitNumber - splitNumber) < 0) {
        //此处检查单调性变化且未取到理想分段数
        //此处的校正基于合理的均匀的魔数数组，即tempSplitNumber和splitNumber的差值较小如1和2，始终取大刻度
        while (tempSplitNumber < splitNumber) {
          //让maxi或mini增大或减少一个estep直到取到理想分段数
          //  if((min-minValue)<=(max-maxValue)&&min!==0||max===0)
          if (
            [0, -1].includes(
              min.minus(minValue).comparedTo(max.minus(maxValue)) &&
                min.comparedTo(0) !== 0
            ) ||
            max.comparedTo(0) === 0
          ) {
            //在尽量保留0刻度的前提下，让更接近最值的一边扩展一个刻度
            // min-=estep
            min = min.minus(estep)
          } else {
            // max+=estep
            max = max.plus(estep)
          }
          tempSplitNumber++
          if (tempSplitNumber === splitNumber) break outter
        }
      }

      //当魔数下标越界或取到理想分段数时退出循环
      if (i >= magic.length - 1 || i <= 0 || tempSplitNumber === splitNumber) {
        break
      }
      //记录上一次的魔数下标
      lastIndex = i
      //尝试取符合趋势的邻近魔数
      if (tempSplitNumber > splitNumber) {
        // estep = magic[++i]*multiple
        estep = multiple.times(magic[++i])
      } else {
        // estep = magic[--i]*multiple
        estep = multiple.times(magic[--i])
      }
      //重新计算刻度
      countDegree(estep)
    } while (tempSplitNumber !== splitNumber)
  }
  // 计算刻度间隔
  // const interval = (max-min)/splitNumber
  let interval = max.minus(min).div(splitNumber).toNumber()
  // 处理interval格式(避免刻度间隔长度过长)
  const { formatNumber: formatInterval, power: intervelPower } =
    formatNumInteger(interval)
  interval = BigNumber(formatInterval).times(Math.pow(10, intervelPower))
  // 如果最大刻度为0,那么根据格式化后的刻度间隔计算最小刻度
  if (max.comparedTo(0) === 0) {
    min = interval.times(-splitNumber)
  } else {
    // 否则最大刻度为最小刻度+总刻度区间长度
    max = interval.times(splitNumber).plus(min)
  }
  max = max.toNumber()
  min = min.toNumber()
  interval = interval.toNumber()
  return {
    max,
    min,
    interval,
  }
}
