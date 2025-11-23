import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import {
    BellIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    UserIcon
} from "react-native-heroicons/outline";

// --- Paleta Básica ---
const COLORS = {
    active: '#000000',
    inactive: '#9CA3AF',
    background: '#FFFFFF',
    accent: '#111827'
};

const BottomNavBar: React.FC = () => {
    const router = useRouter();
    const pathname = usePathname() || '/';

    const getActiveTab = (path: string) => {
        if (pathname === '/' && path === '/') return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        return false;
    };

    const NavItem: React.FC<{ path: string; Icon: React.ElementType }> = ({ path, Icon }) => {
        const isActive = getActiveTab(path);
        const iconColor = isActive ? COLORS.active : COLORS.inactive;

        return (
            <TouchableOpacity onPress={() => router.push(path)} style={styles.navItem}>
                <Icon size={24} color={iconColor} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.navBar}>
                <NavItem path="/" Icon={HomeIcon} />
                <NavItem path="/search" Icon={MagnifyingGlassIcon} />
                
                {/* Botón Central Simple */}
                <TouchableOpacity style={styles.addButton} onPress={() => router.push('/crear-post')}>
                    <View style={styles.addButtonInner}>
                        <PlusIcon size={28} color={COLORS.background} />
                    </View>
                </TouchableOpacity>

                <NavItem path="/likes" Icon={BellIcon} />
                <NavItem path="/profile" Icon={UserIcon} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    navBar: {
        flexDirection: 'row',
        height: 55,
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: COLORS.background,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    navItem: {
        padding: 12,
    },
    addButton: {
        width: 48,
        height: 48,
        marginTop: -20,
    },
    addButtonInner: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default BottomNavBar;