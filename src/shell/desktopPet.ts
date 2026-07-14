const PET_STORAGE = 'ztionixos-pet-on'

// Orange blob. Off by default — type `secret pet` in terminal to enable
export function isDesktopPetOn(): boolean {
  return localStorage.getItem(PET_STORAGE) === 'on'
}

export function setDesktopPetOn(on: boolean): void {
  if (on) {
    localStorage.setItem(PET_STORAGE, 'on')
  } else {
    localStorage.setItem(PET_STORAGE, 'off')
  }
}

export function initializeDesktopPet(desktopElement: HTMLElement): () => void {
  if (!isDesktopPetOn()) {
    return () => {}
  }

  const pet = document.createElement('div')
  pet.className = 'desktop-pet'
  pet.setAttribute('aria-hidden', 'true')
  pet.innerHTML = '<span class="desktop-pet-body">◉</span><span class="desktop-pet-shadow"></span>'
  desktopElement.append(pet)

  let petX = 48
  let petY = 48
  let grabTargetX = petX
  let grabTargetY = petY
  let idleTicks = 0
  let frameId = 0
  let lagFactor = 0.14 // lower = floatier pet. 0.14 felt right after tuning

  const movePetTowardTarget = () => {
    const dx = grabTargetX - petX
    const dy = grabTargetY - petY
    if (Math.abs(dx) > 0.01) {
      petX = petX + dx * lagFactor
    } else {
      petX = grabTargetX
    }
    if (Math.abs(dy) > 0.01) {
      petY = petY + dy * lagFactor
    } else {
      petY = grabTargetY
    }

    let isStill = false
    if (Math.abs(grabTargetX - petX) < 0.4) {
      if (Math.abs(grabTargetY - petY) < 0.4) {
        isStill = true
      }
    }

    if (isStill) {
      idleTicks++
    } else {
      idleTicks = 0
    }

    const roundedX = Math.round(petX)
    const roundedY = Math.round(petY)
    pet.style.transform = 'translate(' + roundedX + 'px, ' + roundedY + 'px)'

    if (idleTicks > 40) {
      pet.classList.add('desktop-pet--idle')
      pet.classList.remove('desktop-pet--hop')
    } else {
      pet.classList.remove('desktop-pet--idle')
      if (!isStill) {
        pet.classList.add('desktop-pet--hop')
      } else {
        pet.classList.remove('desktop-pet--hop')
      }
    }

    frameId = requestAnimationFrame(movePetTowardTarget)
  }

  const onPointerMove = (e: PointerEvent) => {
    const box = desktopElement.getBoundingClientRect()
    grabTargetX = e.clientX - box.left - 14
    grabTargetY = e.clientY - box.top - 22
    if (grabTargetX < 0) grabTargetX = 0
    if (grabTargetY < 0) grabTargetY = 0
    if (grabTargetX > box.width - 20) grabTargetX = box.width - 20
    if (grabTargetY > box.height - 20) grabTargetY = box.height - 20
  }

  desktopElement.addEventListener('pointermove', onPointerMove)
  frameId = requestAnimationFrame(movePetTowardTarget)

  return () => {
    cancelAnimationFrame(frameId)
    desktopElement.removeEventListener('pointermove', onPointerMove)
    pet.remove()
  }
}
