import asyncio
import time

def say_hello1():
    time.sleep(1)
    print("Hello World1!")

async def say_hello():
    await asyncio.sleep(2)
    print("Hello World!")

async def say_good_bye():
    await asyncio.sleep(2)
    print("GoodBye World!")

async def main():
    start=time.time()
    say_hello1()
    await asyncio.gather(say_hello(),say_good_bye())
    total = time.time() - start
    print(f"Total time for this version: {total:.2f} seconds")



asyncio.run(main())